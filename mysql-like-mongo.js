const Connect = require("./connection");
const Schema = require("./schema");
const DataTypes = require("./dataTypes");
const model = require("./model");

function MySqllikeMongo() {
	this.connection = null;
	this.Connect = function({host, database, user, password}) {
		this.connection = Connect({host, user, password, database})
	}
	this.Schema = Schema;
	this.DataTypes = DataTypes;
	this.Model = function(tableName, schema){
		return model(tableName, schema, () => this.connection)
	}
	this.Query = function(sql) {
		try {
			const data = await this.connection.query(sql);
			return {error: null, data}
		} catch (error) {
			return {error, data: null}
		}
	}
}

module.exports = new MySqllikeMongo();