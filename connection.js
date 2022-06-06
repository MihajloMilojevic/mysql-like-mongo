const mysql = require('serverless-mysql')

// function that connects to specific database
function connect({host, database, user, password}) {
	return mysql({
		config: {
		  host,
		  database,
		  user,
		  password,
		}
	});
}

module.exports = connect