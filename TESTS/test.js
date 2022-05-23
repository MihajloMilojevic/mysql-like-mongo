const mysql = require("mysql-like-mongo");
const { allowedNodeEnvironmentFlags } = require("process");

 mysql.Connect({
	host: "localhost",
	database: "fakultet",
	user: "root",
	password: ""
})

console.log("TEST CONNECTION",mysql.Connection);
const schema = mysql.Schema({
	id_grupe: {
		type: mysql.DataTypes.INTEGER,
		primary: true,
		auto: true
	},
	naziv: {
		type: mysql.DataTypes.STRING
	}
})
const Grupa = mysql.Model("grupe", schema);

(async function() {
	// await Grupa.find({})
	// console.log(all);
	
	await Grupa.create({naziv: "Paket test"});
	// all = (await Grupa.find({}))
	// console.log(all);
})()