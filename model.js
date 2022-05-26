const Schema = require("./schema");
const dataTypes = require("./dataTypes");

function SQLType(value) {
	if(typeof value === "string")
		return `'${value}'`;
	return value
}

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

function Where(filter) {
	let queries = [];
	for(let key in filter) {
		if(typeof filter[key] === "object") {
			const op = Object.keys(filter[key])[0];
			if(op === "null") {
				if(filter[key][op])
					queries.push(`${key} IS NULL`)
				else
					queries.push(`${key} IS NOT NULL`)
			}
			else
				queries.push(`${key} ${op} ${SQLType(filter[key][op])}`)
		}
		else {
			queries.push(`${key} = ${SQLType(filter[key])}`)
		}
	}
	return queries.join(" AND ");
}
function Set(changes) {
	let queries = [];
	for(let key in changes) {
		queries.push(`${key} = ${SQLType(changes[key])}`);
	}
	return queries.join(" , ");
}

function model(tableName, schema, getDB) {
	schema = Schema(schema);
	let mutableFields = [];
	let allFields = [];
	let autoFields = [];
	let primaryKeys = [];
	for(let key in schema) {
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
	const Model = function(params = {}) {
		for(let key in schema) {
			this[key] = null;
			if(schema[key].hasOwnProperty("default"))
				this[key] = typeof schema[key].default === "function" ? 
							ConvertToType(schema[key].default(), schema[key].type) : 
							ConvertToType(schema[key].default, schema[key].type);
			if(params.hasOwnProperty(key))
				this[key] = ConvertToType(params[key], schema[key].type);
		}
	}
	Model.prototype = {
		insert: async function() {
				try {
					const DB = getDB();
					const result = await DB.query(
							`INSERT INTO ${tableName}(${mutableFields.join(", ")}) ` +
							`VALUES(${mutableFields.map(() => "?").join(", ")})`
						,
						mutableFields.map(key => this[key])
					)
					for(let key in autoFields)
						this[key] = result.insertId
					return {error: null, data: result}
				} catch (error) {
					return {error, data: null}
				}
			},
		update: async function() {
				try {
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
					return {error: null, data: result}
				} catch (error) {
					return {error, data: null}
				}
			},
		delete: async function() {
				try {
					const DB = getDB();
					const result = await DB.query(
							`DELETE FROM ${tableName} ` +
							`WHERE ${primaryKeys.map(key => `${key} = ?`).join(" AND ")}`
						,
							primaryKeys.map(key => this[key])
					)
					return {error: null, data: result}
				} catch (error) {
					return {error, data: null}
				}
			},
		
	}
	Model.addStaticMethod = function(name, method) {
		Model[name] = method;
	}
	Model.addMethod =  function(name, method) {
		Model.prototype[name] = method;
	}
	Model.create = async (data) => {
		const newObj = new Model(data);
		const result = await newObj.insert();
		return result;
	}
	Model.find = async (filter) => {
		try {
			const DB = getDB();
			const where = Where(filter);
			const result = await DB.query(
				` SELECT * FROM ${tableName} ` + 
				`WHERE ${where !== "" ?  where: 1}`
			)
			const all = result.map((item => (new Model(item))))
			return {error: null, data: all}
		} catch (error) {
			return {error, data: null};
		}
	}
	Model.findAndUpdate = async (filter, changes) => {
		try {
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
			return {error: null, data: result}
		} catch (error) {
			return {error, data: null};
		}
	}
	Model.findAndDelete = async (filter) => {
		try {
			const DB = getDB();
			const where = Where(filter);
			const result = await DB.query(
				`DELETE FROM ${tableName} ` + 
				`WHERE ${where !== "" ?  where: 1}`
			)
			return {error: null, data: result}
		} catch (error) {
			return {error, data: null};
		}
	}
	Model.query = async (query) => {
		try {
			const DB = getDB();
			const result = await DB.query(query)
			return {error: null, data: result}
		} catch (error) {
			return {error, data: null};
		}
	}
	return Model
}

module.exports = model;