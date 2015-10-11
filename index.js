var mysql = require('mysql');
var net = require('net');


/*
	create database connection
	set database to use
*/

var connection = mysql.createConnection({
	host 		: 'localhost',
	user 		: 'root',
	password 	: ''
});
connection.query('USE gps_database_younus');

/*
	Define variables to hold and represent data
	inspired from 
	https://github.com/tananaev/traccar/blob/master/src/org/traccar/protocol/Gt06ProtocolDecoder.java

	The socket connection comes in as hex value. Need to read them 1 by one and perform action.
*/
var MSG_LOGIN 			= 0x01;
var MSG_LOCATION_DATA 	= 0x12;
var MSG_STATUS_INFO		= 0x13;
var MSG_SEND_INFO		= 0x80; 




net.createServer(function(socket) {
	//socket.setEncoding('hex');
	socket.on('data',function(d) {
		/*
			TODO:
			1. Identify which type of packet is recevied
			2. If packet is login, get IMEI number, send response.
			3. If packet is heartbeat, store with the saved IMEI number, send response.
			4. If packet is status, send response.
		*/

		//Testing
		console.log(d);
		for(var i=0;i<d.length;i++)
			console.log(d.readUInt8[i]);
		
	});
}).listen(8000);