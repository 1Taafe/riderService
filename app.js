const express = require('express');
const bodyParser = require('body-parser');
const database = require('./database')

const cors = require('cors');
const app = express();
const port = 3000;

app.use(bodyParser.json());

app.use(cors({
  origin: '*'
}));

app.get('/serverStatus', (req, res) => {
    res.send('Server is running!');
});

app.post('/auth', async (req, res) => {
  let userInfo = null;
  const {username, password} = req.body;
  userInfo = await database.auth(username, password).then((result) => {
    res.status(200).json({
      role: result.role_name,
      username: result.username,
      phone_number: result.phone_number,
      displayed_name: result.displayed_name,
      user_key: result.auth_key
    })
  }).catch((error) => {
    console.log(error);
    res.status(404).json({
      status: 'Error occured while trying to auth! ',
      'error': error
    })
  })

})

app.post('/register', async (req, res) => {
  const {role, username, password, phone_number, displayed_name} = req.body;  
    await database.register(role, username, password, phone_number, displayed_name).then(
      () => {
        res.status(200).json({
          status: "Registered!"
        })
      }
    ).catch(
      (error) => {
        console.log(error);
        res.status(404).json({
          status: "Unknown exception under register operation!"
        })
      }
    )
})

app.post('/createTrip', async (req, res) => {
  const {departure_city, destination_city, user_key, car_number, car_model, description, departure_time,
    destination_time, max_places, cost} = req.body;
    await database.createTrip(departure_city, destination_city, user_key, car_number, car_model, description,
      departure_time, destination_time, max_places, cost).then(() => {
        res.status(200).json({
          status: 'Trip has been successfully created!'
        })
      }).catch((error) => {
        console.log(error);
        res.status(404).json({
          status: 'An error has occured while creating trip.'
        })
      })
})

app.post('/cancelTrip', async (req, res) => {
  const {user_key, trip_id} = req.body;
  await database.cancelTrip(user_key, trip_id).then(() => {
    res.status(200).json({
      status: 'Trip has been cancelled!'
    })
  }).catch((error) => {
    console.log(error);
    res.status(404).json({
      status: 'Error under trip cancellation operation',
      message: error
    })
  })
})

app.post('/completeTrip', async (req, res) => {
  const {user_key, trip_id} = req.body;
  await database.completeTrip(user_key, trip_id).then(() => {
    res.status(200).json({
      status: 'Trip has been completed!'
    })
  }).catch((error) => {
    console.log(error);
    res.status(404).json({
      status: 'Error under trip cancellation operation',
      message: error
    })
  })
})

app.post('/findTrips', async (req, res) => {
  const {user_key, departure_city, destination_city, departure_date} = req.body;
  await database.findTrips(user_key, departure_city, destination_city, departure_date).then((trips) => {
    res.status(200).json({
      trips
    })
  }).catch((error) => {
    console.log(error);
    res.status(404).json({
      status: 'Error under finding trips operation',
      message: error
    })
  })
})

app.post('/getAllPassengerTrips', async (req, res) => {
  const {user_key} = req.body;
  await database.getAllPassengerTrips(user_key).then((trips) => {
    res.status(200).json({
      trips
    })
  }).catch((error) => {
    console.log(error);
    res.status(404).json({
      status: 'Error under finding passenger trips operation',
      message: error
    })
  })
})

app.post('/getAllDriverTrips', async (req, res) => {
  const {user_key} = req.body;
  await database.getAllDriverTrips(user_key).then((trips) => {
    res.status(200).json({
      trips
    })
  }).catch((error) => {
    console.log(error);
    res.status(404).json({
      status: 'Error under finding driver trips operation',
      message: error
    })
  })
})

app.post('/getTripPassengers', async (req, res) => {
  const {user_key, trip_id} = req.body;
  await database.getTripPassengers(user_key, trip_id).then((passengers) => {
    res.status(200).json({
      passengers
    })
  }).catch((error) => {
    console.log(error);
    res.status(404).json({
      status: 'Error under finding trip passengers operation',
      message: error
    })
  })
})

app.post('/reservePlace', async (req, res) => {
  const {user_key, trip_id} = req.body;
  await database.reservePlace(user_key, trip_id).then(() => {
    res.status(200).json({
      status: 'Place has been successfully reserved!'
    })
  }).catch((error) => {
    console.log(error);
    res.status(404).json({
      status: 'Error under reserving place operation',
      message: error
    })
  })
})

app.post('/checkPlace', async (req, res) => {
  const {user_key, trip_id} = req.body;
  await database.checkPlace(user_key, trip_id).then(() => {
    res.status(200).json({
      status: 'Place is available to reserve!'
    })
  }).catch(() => {
    res.status(404).json({
      staus: 'Place is already reserved!'
    })
  })
})

app.post('/cancelPlace', async (req, res) => {
  const {user_key, trip_id} = req.body;
  await database.cancelPlace(user_key, trip_id).then(() => {
    res.status(200).json({
      status: 'Place is cancelled!'
    })
  }).catch(() => {
    res.status(404).json({
      staus: 'Error under cancellation operation!'
    })
  })
})

app.get('/getCities', async (req, res) => {
  await database.getCities().then((result) => {
    res.status(200).json({
      result
    })
  }).catch((error) => {
    console.log(error);
    res.status(404).json({
      status: 'Cant get all cities from db!',
      message: error
    })
  })
})

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
