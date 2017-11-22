const satelliteRouter = require('express').Router();

var {Satellites} = require('../../models/satellites');


// all satellites route => '/satellites'

satelliteRouter.get('/satellites', (req, res) => {
    Satellites.find().then((satellites) => {
        res.status(200).json({satellites});
    }).catch((e) => {
        res.status(404).send(e);
    });
});


// find satellite by id => '/satellites/:id'

satelliteRouter.get('/satellites/:id', (req, res) => {
    const satId = req.params.id;
    Satellites.findOne({ _id: satId }).then((satellite) => {
        res.status(200).json({satellite});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// find satellite by slot => '/satellites/:slot'

satelliteRouter.post('/satellites-by-slot', (req, res) => {
    let {slot} = req.body
    Satellites.find({ orbital_slot: slot}).then((satellites) => {
        res.status(200).json({satellites});
    }).catch((e) => {
        res.status(404).send(e);
    });
});


module.exports = satelliteRouter;