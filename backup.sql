CREATE OR REPLACE FUNCTION register(
    role text, 
    username text, 
    password text,
    phone_number text, 
    displayed_name text, 
    auth_key text
) 
RETURNS void AS $$
DECLARE
    role_id integer;
BEGIN
    SELECT id INTO role_id FROM roles WHERE name = role;
    INSERT INTO users(role_id, username, password, phone_number, displayed_name, auth_key)
        VALUES(role_id, username, password, phone_number, displayed_name, auth_key);
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth(username text, password text)
RETURNS integer AS $$
DECLARE
    user_exists integer;
BEGIN
    SELECT COUNT(*) INTO user_exists FROM users WHERE users.username = $1 AND users.password = $2;
    RETURN user_exists;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_key(username text, password text)
RETURNS text AS $$
DECLARE
    user_key text;
Begin
    SELECT auth_key INTO user_key from users where users.username = $1 AND users.password = $2;
    return user_key;
end;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

create or replace function create_trip(departure_city text, destination_city text, user_key text, car_number text,
car_model text, description text, departure_time timestamp without time zone,
destination_time timestamp without time zone, max_places integer, cost double precision) returns void
    security definer
    language plpgsql
as
$$
    DECLARE
        v_departure_city_id int;
        v_destination_city_id int;
        v_route_id int;
        v_user_id int;
        v_car_id int;
        v_role text;
    BEGIN
        Select id into v_departure_city_id from cities where name ILIKE '%' || departure_city || '%';

        IF v_departure_city_id IS NULL THEN
        INSERT INTO cities (name)
        VALUES (departure_city)
        RETURNING id INTO v_departure_city_id;
        END IF;

        Select id into v_destination_city_id from cities where name ILIKE '%' || destination_city || '%';

        IF v_destination_city_id IS NULL THEN
        INSERT INTO cities (name)
        VALUES (destination_city)
        RETURNING id INTO v_destination_city_id;
        END IF;

        Select id into v_route_id from routes where destination_city_id = v_destination_city_id AND departure_city_id = v_departure_city_id;

        IF v_route_id IS NULL THEN
            INSERT INTO routes(departure_city_id, destination_city_id) values (v_departure_city_id, v_destination_city_id)
            RETURNING id INTO v_route_id;
        end if;

        perform check_role(user_key, 'driver');

        select id into v_car_id from cars where cars.model ILIKE car_model AND cars.number ILIKE car_number AND owner_id = v_user_id;

        IF v_car_id IS NULL THEN
        INSERT INTO cars (owner_id, model, number)
        VALUES (v_user_id, car_model, car_number)
        RETURNING id INTO v_car_id;
        END IF;

        insert into trips(route_id, creator_id, car_id, description, departure_time, destination_time, max_places, cost)
        values(v_route_id, v_user_id, v_car_id, description, departure_time, destination_time, max_places, cost);

    end;
$$;

create or replace function check_role(user_key text, required_role text)
    returns void as $$
    DECLARE
        v_user_id int;
        v_role text;
    BEGIN
        select id into v_user_id from users where auth_key = user_key;

        IF v_user_id IS NULL THEN
            RAISE EXCEPTION 'user_key is invalid!';
        end if;

        select name into v_role from roles inner join users u on roles.id = u.role_id where auth_key = user_key;

        IF v_role != required_role THEN
            RAISE EXCEPTION 'user have no permission!';
        end if;
    end;
    $$ LANGUAGE plpgsql
SECURITY DEFINER;


CREATE OR REPLACE FUNCTION find_trips(
    user_key text,
    p_departure_city TEXT,
    p_destination_city TEXT,
    p_departure_date DATE
)
RETURNS TABLE (
    trip_id int,
    departure_city TEXT,
    destination_city TEXT,
    departure_time TIMESTAMP,
    destination_time TIMESTAMP,
    cost FLOAT,
    free_places BIGINT
) AS $$
DECLARE
    v_route_id INT;
    v_departure_city_id INT;
    v_destination_city_id INT;
BEGIN
    perform check_role(user_key, 'passenger');

    SELECT id INTO v_departure_city_id FROM cities WHERE name ILIKE '%' || p_departure_city || '%';
    SELECT id INTO v_destination_city_id FROM cities WHERE name ILIKE '%' || p_destination_city || '%';

    SELECT id INTO v_route_id FROM routes WHERE departure_city_id = v_departure_city_id AND destination_city_id = v_destination_city_id;

    RETURN QUERY
        SELECT
            t.id,
            p_departure_city,
            p_destination_city,
            t.departure_time,
            t.destination_time,
            t.cost,
            t.max_places - COUNT(p.trip_id) AS free_places
        FROM
            trips t
            LEFT JOIN participants p ON t.id = p.trip_id
        WHERE
            t.route_id = v_route_id
            AND DATE(t.departure_time) = p_departure_date
        GROUP BY
            t.id,
            t.max_places
        HAVING
            t.max_places - COUNT(p.trip_id) > 0 OR COUNT(p.trip_id) IS NULL;

END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;

Create or replace function reserve_place(user_key text, p_trip_id int)
returns void as $$
    DECLARE
        v_exist_counter int;
        v_user_id int;
        Begin

            perform check_role(user_key, 'passenger');
            select id into v_user_id from users where auth_key = user_key;

            select count(user_id) into v_exist_counter
                                    from participants
                                    where participants.trip_id = p_trip_id AND participants.user_id = v_user_id;

            IF v_exist_counter > 0 THEN
                RAISE EXCEPTION 'Trip place has already been reserved!';
            end if;

            insert into participants(user_id, trip_id, status) values(v_user_id, p_trip_id, 'reserved');

        end;
    $$ LANGUAGE plpgsql
SECURITY DEFINER;

create or replace function cancel_trip(user_key text, p_trip_id int)
returns void as $$
    DECLARE
        v_exist_counter int;
        v_user_id int;
        Begin
            perform check_role(user_key, 'driver');
            select id into v_user_id from users where auth_key = user_key;
            select count(id) into v_exist_counter from trips where creator_id = v_user_id and id = p_trip_id;
            IF v_exist_counter < 1 then
                raise exception 'Exception while finding drivers trip';
            end if;
            update participants set status = 'cancelled by driver' where trip_id = p_trip_id;
        end;
    $$ LANGUAGE plpgsql
SECURITY DEFINER;

create or replace function complete_trip(user_key text, p_trip_id int)
returns void as $$
    DECLARE
        v_exist_counter int;
        v_user_id int;
        Begin
            perform check_role(user_key, 'driver');
            select id into v_user_id from users where auth_key = user_key;
            select count(id) into v_exist_counter from trips where creator_id = v_user_id and id = p_trip_id;
            IF v_exist_counter < 1 then
                raise exception 'Exception while finding drivers trip';
            end if;
            update participants set status = 'completed' where trip_id = p_trip_id;
        end;
    $$ LANGUAGE plpgsql
SECURITY DEFINER;

create or replace function get_all_driver_trips(user_key text)
returns table(id int, departure_city text, destination_city text, departure_time timestamp, destination_time timestamp,
max_places int, cost float, car_model text, car_number text)
as $$
    DECLARE
        Begin
            perform check_role(user_key, 'driver');
            return query
                select trips.id, c.name, c2.name, trips.departure_time, trips.destination_time,
                       trips.max_places, trips.cost, c3.model, c3.number
                        from trips inner join routes on trips.route_id = routes.id
                        inner join cities c on c.id = routes.departure_city_id
                        inner join cities c2 on c2.id = routes.destination_city_id
                        inner join cars c3 on trips.car_id = c3.id
                        inner join users on creator_id = users.id
                        where users.auth_key = user_key;
        end;
    $$ LANGUAGE plpgsql
SECURITY DEFINER;

create or replace function get_all_passenger_trips(user_key text)
returns table(id int, status text, departure_city text, destination_city text, car_number text, car_model text,
departure_time timestamp, destination_time timestamp, description text, cost float)
as $$
    DECLARE
        Begin
            perform check_role(user_key, 'passenger');
            return query select t.id, participants.status, c.name, c2.name, c3.number, c3.model, t.departure_time,
            t.destination_time, t.description, t.cost from participants
            inner join trips t on t.id = participants.trip_id
            inner join users u on u.id = participants.user_id
            inner join routes r on r.id = t.route_id
            inner join cities c on c.id = r.departure_city_id
            inner join cities c2 on c2.id = r.destination_city_id
            inner join cars c3 on c3.id = t.car_id
            where u.auth_key = user_key;
        end;
$$ LANGUAGE plpgsql
SECURITY DEFINER;


select * from get_all_driver_trips('d1af194b66c3fbfc79f0c66e823ea2b39634cbdde477605e92f944e6c7e5e9d6');

select * from get_all_passenger_trips('14fa730f173045b9d658e8cea31d2a37851c080f64516892d24e9988f586842c');

select cancel_trip('d1af194b66c3fbfc79f0c66e823ea2b39634cbdde477605e92f944e6c7e5e9d6', 20);

select complete_trip('d1af194b66c3fbfc79f0c66e823ea2b39634cbdde477605e92f944e6c7e5e9d6', 20);

select reserve_place('14fa730f173045b9d658e8cea31d2a37851c080f64516892d24e9988f586842c', 20);

select * from find_trips('14fa730f173045b9d658e8cea31d2a37851c080f64516892d24e9988f586842c','Ошмяны', 'Червень','2024-04-05');

select create_trip('Ошмяны', 'Червень', 'd1af194b66c3fbfc79f0c66e823ea2b39634cbdde477605e92f944e6c7e5e9d6', '2009 OP-4', 'Tesla Model X', 'mytrip', '2024-04-05 19:34:56', '2022-04-05 12:34:56', 10, 12.20);
