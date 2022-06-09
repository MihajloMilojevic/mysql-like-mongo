const Schema = require("./schema");
const dataTypes = require("./dataTypes");

// function that enlosures string with single quotes
function SQLType(value) {
	if(typeof value === "string")
		return `'${value}'`;
	return value
}

// converts some value to specific type
function ConvertToType(value, type = dataTypes.STRING) {
	if(value === null || value === undefined)
		return null;
	switch (type) {
		case dataTypes.STRING:
			return "" + value;
		case dataTypes.INTEGER:
			return parseInt(value);
		case dataTypes.FLOAT:
			return parseFloat(value);
		case dataTypes.DATETIME:
			return new Date(value);
		case dataTypes.BOOL:
			return !!value;
		default:
			throw new Error("Invalid data type");
	}
}

// creates a SQL where clause based on filter object
function Where(filter) {
	// example:
	// input:  
	// {
	// 	id: 2,
	// 	value: {
	// 		null: false,
	//		"<": 100
	// 	},
	// something: [true, [1, 2, 3]]
	// }
	// output:
	// 'id = 2 AND value IS NOT NULL AND value < 100 AND something IN (1 , 2 , 3)'

	let queries = []; // queries array
	for(let key in filter) { // loops through keys in filter object
		if(Array.isArray(filter[key])) { // if its an array we use IN clause
			if(filter[key][0])
				queries.push(`${key} IN (${filter[key][1].map(value => SQLType(value)).join(" , ")})`);
			else
				queries.push(`${key} NOT IN (${filter[key][1].map(value => SQLType(value)).join(" , ")})`);
		}
		else if(typeof filter[key] === "object") { // for objects example key: value
			const keys = Object.keys(filter[key]);
			console.log(keys);
			for(let i = 0; i < keys.length; i++) { // loops through keys in an object
				if(keys[i] === "null") { // check if its null and if it IS null or IS NOT (true or false)
					if(filter[key][keys[i]])
						queries.push(`${key} IS NULL`)
					else
						queries.push(`${key} IS NOT NULL`)
				}
				else // for those keys that are not null we consider them as operatos
					queries.push(`${key} ${keys[i]} ${SQLType(filter[key][keys[i]])}`)
			}
		}
		else { // if its not an object we just use = operator and value provided
			queries.push(`${key} = ${SQLType(filter[key])}`)
		}
	}
	return queries.join(" AND "); // returns queries joined by AND
}

// returns SQL SET clause for UPDATE
function Set(changes) {
	let queries = [];
	for(let key in changes) {
		queries.push(`${key} = ${SQLType(changes[key])}`);
	}
	return queries.join(" , ");
}

// returns constructor function that is used to create Models of specific table with specific schema
function model(tableName, schema, getDB) {
	schema = Schema(schema); // creates schema from passed object
	let mutableFields = [];  // fields that can be changes with UPDATE
	let allFields = []; // all fields that model has
	let autoFields = []; // AUTO_INCREMENT fields
	let primaryKeys = []; // primary keys
	for(let key in schema) { // loops thrught schema and adds fields to arrays
		if(schema[key].hasOwnProperty("auto") && schema[key].auto)
			autoFields.push(key);
		else if((schema[key].hasOwnProperty("mutable") && !schema[key].mutable) || !schema[key].hasOwnProperty("mutable"))
			mutableFields.push(key);
		if(schema[key].hasOwnProperty("primary") && schema[key].primary)
			primaryKeys.push(key);
		allFields.push(key);
		if(primaryKeys.length == 0)
			throw new Error("Schema must contain at least one primary key");
	}
	// constructor function for model
	const Model = function(params = {}) {
		for(let key in schema) { // loops through schema and creates fields of new objects
			this[key] = null;
			if(schema[key].hasOwnProperty("default")) // sets defaults values
				this[key] = typeof schema[key].default === "function" ? // makes function calls if neccesery
							ConvertToType(schema[key].default(), schema[key].type) : 
							ConvertToType(schema[key].default, schema[key].type);
			if(params.hasOwnProperty(key)) // sets values if provided when creating object instance
				this[key] = ConvertToType(params[key], schema[key].type);
		}
	}
	Model.prototype = {
		insert: async function() { // method that inserts instance into database
				const DB = getDB();
				const result = await DB.query(
						`INSERT INTO ${tableName}(${mutableFields.join(", ")}) ` +
						`VALUES(${mutableFields.map(() => "?").join(", ")})`
					,
					mutableFields.map(key => this[key]) 
				)
				for(let key of autoFields)
					this[key] = result.insertId // sets auto fileds to those that are inserted
				return result
			},
		update: async function() { // method that updates instance by its ids
				const DB = getDB();
				const result = await DB.query(
						`UPDATE ${tableName} ` +
						`SET ${mutableFields.map(key => `${key}} = ?`).join(" , ")} ` +
						`WHERE ${primaryKeys.map(key => `${key} = ?`).join(" AND ")}`
					,
					[
						...mutableFields.map(key => this[key]),
						...primaryKeys.map(key => this[key])
					]
				)
				return result
			},
		delete: async function() { // method for deleting instance from database
			const DB = getDB();
			const result = await DB.query(
					`DELETE FROM ${tableName} ` +
					`WHERE ${primaryKeys.map(key => `${key} = ?`).join(" AND ")}`
				,
					primaryKeys.map(key => this[key])
			)
			return result
			},
		
	}
	// static function that adds method directly to Model
	Model.addStaticMethod = function(name, method) {
		Model[name] = method;
	}
	// static function that adds method for every instance
	Model.addMethod =  function(name, method) {
		Model.prototype[name] = method;
	}
	// static method that creates new instance and inserts it
	Model.create = async (data) => {
		const DB = getDB();
		const result = await DB.query(
				`INSERT INTO ${tableName}(${mutableFields.join(", ")}) ` +
				`VALUES ${
					data.map(
						() => (
								`(${mutableFields.map(() => "?").join(", ")}),`
							)
					).join(", ")
				}`
			,
			data.map(el => mutableFields.map(key => el[key]))
		)
		return result
	}
	// function that finds method filtered by filter objected
	Model.find = async (filter) => {
		const DB = getDB();
		const where = Where(filter);
		const result = await DB.query(
			` SELECT * FROM ${tableName} ` + 
			`WHERE ${where !== "" ?  where: 1}`
		)
		const all = result.map((item => (new Model(item)))) // returns array of instances of model
		return all
	}
	// function that finds and updates 
	Model.findAndUpdate = async (filter, changes) => {
		const DB = getDB();
		const where = Where(filter);
		const set = Set(changes)
		if(set === "")
			throw new Error("Must have at least one change")
		const result = await DB.query(
			`UPDATE ${tableName} ` +
			`SET ${set} ` + 
			`WHERE ${where !== "" ? where : 1}`
		)
		return result
	}
	// function that deletes
	Model.findAndDelete = async (filter) => {
		const DB = getDB();
		const where = Where(filter);
		const result = await DB.query(
			`DELETE FROM ${tableName} ` + 
			`WHERE ${where !== "" ?  where: 1}`
		)
		return result
	}
	// custom query
	Model.query = async (query) => {
		const DB = getDB();
		const result = await DB.query(query)
		return result
	}
	return Model
}

module.exports = model;