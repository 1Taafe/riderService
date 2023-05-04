const { Pool } = require('pg');
const crypto = require('crypto');

const guestPool = new Pool({
  user: 'guest',
  host: 'localhost',
  database: 'rider',
  password: 'guest',
  port: 5432,
});

const driverPool = new Pool({
  user: 'driver',
  host: 'localhost',
  database: 'rider',
  password: 'driver',
  port: 5432,
});

const passengerPool = new Pool({
  user: 'driver',
  host: 'localhost',
  database: 'rider',
  password: 'driver',
  port: 5432,
});

const auth = (username, password) => {
  return new Promise(async (resolve, reject) => {
    const client = await guestPool.connect();
    try{
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      const query = 'select * from auth($1, $2)';
      const values = [username, passwordHash];
      const userInfo = await client.query(query, values);
      resolve(userInfo.rows[0]);
    }
    catch(error){
      console.log(error);
      reject(error);
    }
    finally{
      client.release();
    }
  })
}

const register = (role, username, password, phone_number, displayed_name) => {
  return new Promise(async (resolve, reject) => {
    const client = await guestPool.connect();
    try {
      const key_data = String(username) + String(password);
      const auth_key = crypto.createHash('sha256').update(key_data).digest('hex');
      password = crypto.createHash('sha256').update(password).digest('hex');
      const query = 'SELECT * FROM register($1, $2, $3, $4, $5, $6)';
      const values = [role, username, password, phone_number, displayed_name, auth_key];
      await client.query(query, values);
      resolve();
    } catch (error) {
      console.log(error);
      reject(error);
    } finally {
      client.release();
    }
  });
};

const createTrip = (departure_city, destination_city, user_key, car_number, car_model, description, departure_time,
  destination_time, max_places, cost) => {
    return new Promise(async (resolve, reject) => {
      const client = await driverPool.connect();
      try{
        const query = 'Select create_trip($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
        const values = [departure_city, destination_city, user_key, car_number, car_model, description, departure_time,
        destination_time, max_places, cost];
        await client.query(query, values);
        resolve();
      }
      catch(error){
        console.log(error);
        reject(error);
      }
      finally{
        client.release();
      }
    })
  }

const cancelTrip = (user_key, trip_id) => {
  return new Promise(async (resolve, reject) => {
      const client = await driverPool.connect();
      try{
        const query = 'select cancel_trip($1, $2)';
        const values = [user_key, trip_id];
        await client.query(query, values);
        resolve();
      }
      catch(error){
        console.log(error);
        reject(error);
      }
      finally{
        client.release();
      }
    })
}

const completeTrip = (user_key, trip_id) => {
  return new Promise(async (resolve, reject) => {
    const client = await driverPool.connect();
    try{
      const query = 'select complete_trip($1, $2)';
      const values = [user_key, trip_id];
      await client.query(query, values);
      resolve();
    }
    catch(error){
      console.log(error);
      reject(error);
    }
    finally{
      client.release();
    }
  })
}

const findTrips = (user_key, departure_city, destination_city, departure_date) => {
  return new Promise(async (resolve, reject) => {
    const client = await passengerPool.connect();
    try{
      const query = 'select * from find_trips($1, $2, $3, $4)';
      const values = [user_key, departure_city, destination_city, departure_date];
      const result = await client.query(query, values);
      resolve(result.rows);
    }
    catch(error){
      console.log(error);
      reject(error);
    }
    finally{
      client.release();
    }
  })
}

const getAllDriverTrips = (user_key) => {
  return new Promise(async (resolve, reject) => {
    const client = await driverPool.connect();
    try{
      const query = 'select * from get_all_driver_trips($1)';
      const values = [user_key];
      const result = await client.query(query, values);
      resolve(result.rows);
    }
    catch(error){
      console.log(error);
      reject(error);
    }
    finally{
      client.release();
    }
  })
}

const getAllPassengerTrips = (user_key) => {
  return new Promise(async (resolve, reject) => {
    const client = await passengerPool.connect();
    try{
      const query = 'select * from get_all_passenger_trips($1)';
      const values = [user_key];
      const result = await client.query(query, values);
      resolve(result.rows)
    }
    catch(error){
      console.log(error);
      reject(error);
    }
    finally{
      client.release();
    }
  })
}

const getCities = () => {
  return new Promise(async (resolve, reject) => {
    const client = await guestPool.connect();
    try{
      const query = 'select * from get_cities()';
      const result = await client.query(query);
      resolve(result.rows);
    }
    catch(error){
      console.log(error);
      reject(error);
    }
    finally{
      client.release();
    }
  })
}

const reservePlace = (user_key, trip_id) => {
  return new Promise(async (resolve, reject) => {
    const client = await passengerPool.connect();
    try{
      const query = 'select reserve_place($1, $2)';
      const values = [user_key, trip_id];
      await client.query(query, values);
      resolve();
    }
    catch(error){
      console.log(error);
      reject(error);
    }
    finally{
      client.release();
    }
  })
}

const cancelPlace = (user_key, trip_id) => {
  return new Promise(async (resolve, reject) => {
    const client = await passengerPool.connect();
    try{
      const query = 'select cancel_place($1, $2)';
      const values = [user_key, trip_id];
      await client.query(query, values);
      resolve();
    }
    catch(error){
      console.log(error);
      reject(error);
    }
    finally{
      client.release();
    }
  })
}

const checkPlace = (user_key, trip_id) => {
  return new Promise(async (resolve, reject) => {
    const client = await passengerPool.connect();
    try{
      const query = 'select check_place($1, $2)';
      const values = [user_key, trip_id];
      await client.query(query, values);
      resolve();
    }
    catch(error){
      console.log(error);
      reject(error);
    }
    finally{
      client.release();
    }
  })
}

const getTripPassengers = (user_key, trip_id) => {
  return new Promise(async (resolve, reject) => {
    const client = await driverPool.connect();
    try{
      const query = 'select * from get_trip_passengers($1, $2)';
      const values = [user_key, trip_id];
      const result = await client.query(query, values);
      resolve(result.rows);
    }
    catch(error){

    }
    finally{
      client.release();
    }
  })
}


module.exports = { register, createTrip, cancelTrip,
   completeTrip, auth, findTrips, reservePlace, 
   getAllDriverTrips, getCities, checkPlace, cancelPlace, getAllPassengerTrips, getTripPassengers}