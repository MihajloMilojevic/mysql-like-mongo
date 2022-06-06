const dataTypes = require("./dataTypes");

function isValidType(type) // checks if some type is one of the defined ones
{
	let isType = false;
	for(let dataType in dataTypes)
		if(type === dataTypes[dataType]) {
			isType = true;
			break;
		}
	return isType;
}
//function to create new schema 
function Schema(params) {
	let hasPrimaryKey = false; // check if schema contains primary key field
	for(let key in params) { // loops throught all keys in schema
		if(!hasPrimaryKey && params[key].hasOwnProperty("primary")) hasPrimaryKey = true; // checks if the field is marked as primary key
		if((typeof params[key] === "object" && (!params[key].hasOwnProperty("type") || !isValidType(params[key].type)))) // if field is an object check for a type property and if that type is one of defined dataTypes
			throw new Error(`'${key}' must be one of the valid data types`);
		else if(typeof params[key] !== "object" && !isValidType(params[key])) // if its not an object it must be one of the dataTypes
			throw new Error(`'${key}' must be one of the valid data types`);
	}
	if(!hasPrimaryKey) // throws an error if schema does not contain any primary key fields
		throw new Error("Schema must contain at least one primary key");
	return params;
}

module.exports = Schema;