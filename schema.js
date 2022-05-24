const dataTypes = require("./dataTypes");

function isValidType(type)
{
	let isType = false;
	for(let dataType in dataTypes)
		if(type === dataTypes[dataType]) {
			isType = true;
			break;
		}
	return isType;
}

function Schema(params) {
	let hasPrimaryKey = false;
	for(let key in params) {
		if(!hasPrimaryKey && params[key].hasOwnProperty("primary")) hasPrimaryKey = true;
		if((typeof params[key] === "object" && (!params[key].hasOwnProperty("type") || !isValidType(params[key].type))))
			throw new Error(`'${key}' must be one of the valid data types`);
		else if(typeof params[key] !== "object" && !isValidType(params[key], params[key].type))
			throw new Error(`'${key}' must be one of the valid data types`);
	}
	if(!hasPrimaryKey)
		throw new Error("Schema must contain at least one primary key");
	return params;
}

module.exports = Schema;