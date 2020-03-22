const { Router } = require('express');

const OrderController = require('./controllers/OrderController');

const routes = Router();

routes.post('/order', OrderController.send);

module.exports = routes;
