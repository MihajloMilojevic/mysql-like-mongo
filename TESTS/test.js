const mysql = require("../index");
const { allowedNodeEnvironmentFlags } = require("process");
const model = require("../model");

 mysql.Connect({
	host: "localhost",
	database: "fakultet",
	user: "root",
	password: ""
})

console.log("TEST CONNECTION",mysql.Connection);
const schema = mysql.Schema({
	id_grada: {
		type: mysql.DataTypes.INTEGER,
		primary: true
	},
	naziv: {
		type: mysql.DataTypes.STRING,
		default: ""
	}
})
const Grad = mysql.Model("gradovi", schema);

(async function() {
	var all = await Grad.create([
		{id_grada: 1, naziv: "hello"},
		{id_grada: 2, naziv: "hello"},
		{id_grada: 3, naziv: "hello"},
		{id_grada: 4, naziv: "hello"},
		{id_grada: 5, naziv: "hello"},
		{id_grada: 6, naziv: "hello"}
	]);
	console.log(all);
	
	mysql.connection.quit();
})()