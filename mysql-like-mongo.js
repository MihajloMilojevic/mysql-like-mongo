const Connect = require("./connection");
const Schema = require("./schema");
const DataTypes = require("./dataTypes");
const model = require("./model");

function MySqllikeMongo() {
	this.connection = null; // connection 
	this.Connect = function({host, database, user, password}) { // function to connect
		this.connection = Connect({host, user, password, database})
	}
	this.Schema = Schema; // schema
	this.DataTypes = DataTypes; //dataTypes
	this.Model = function(tableName, schema){ // function for creating a model
		return model(tableName, schema, () => this.connection) // () => this.connection returns current connetion every time model is created
	}
	this.Query = async function(sql) { // function to query database without using any model
		const data = await this.connection.query(sql);
		return data
	}
}

module.exports = new MySqllikeMongo(); // returns new instance of this this class