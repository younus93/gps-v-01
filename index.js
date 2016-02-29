var mysql = require('mysql');
var net = require('net');
	
/*
	create database connection
	set database to use
*/

var connection = mysql.createConnection({
	host 		: 'mysql.theyounus.com',
	user 		: 'theyounuscom',
	password 	: 'NLch-*iL',
	database	: 'gps_database_younus',
	dateStrings	: 'date'
});

/*
	Define variables to hold and represent data
	inspired from 
	https://github.com/tananaev/traccar/blob/master/src/org/traccar/protocol/Gt06ProtocolDecoder.java

	The socket connection comes in as hex value. Need to read them 1 by one and perform action.
*/
var MSG_LOGIN 			= 01;
var MSG_LOCATION_DATA 	= 12;
var MSG_STATUS			= 13;
var MSG_SEND_INFO		= 80; 


net.createServer(function(socket) {
	socket.setEncoding('hex');
	var imei;
	var serial_number;
	var length;
	var error_check;
	var protocol;
	socket.on('data',function(d) {
		/*
			TODO:
			1. Identify which type of packet is recevied
			2. If packet is login, get IMEI number, send response.
			3. If packet is heartbeat, store with the saved IMEI number, send response.
			4. If packet is status, send response.
			5. Save the raw information in the g_p_s_infos database
		*/

		/*
			sample : 78780d010358911020149049000242bd0d0a
			1. Remove 78 78
			2. Read length of packet
			3. Read type of packet.

			4. if protocol is login, send to login method.
				send the remaining data only.
				login method must return the string to be responded back.
		*/
		var das = d.toString().toLowerCase();
		var query = "INSERT INTO ?? (??,??) VALUES (?,?)";
				var values = [	'g_p_s_infos',
								'data','created_at',
								das, new Date()
							];
				var query = connection.query(connection.format(query, values), function(err,result,tableInfo){
				});

		if(das.slice(0,4).toString() == '7878')
		{				
			// removed 78 78
			das = das.slice(4,das.length); 

			length = (das.slice(0,2));
			//removed length value because, length is from protocol to error check. 
			das = das.slice(2,das.length);
			protocol = das.slice(0,2);
			//removed protocol numbers so that only the information remains
			das = das.slice(2,das.length);

			if(protocol == MSG_LOGIN)
			{
				imei = das.slice(0,16);	
				serial_number = das.slice(16,20);
				error_check = das.slice(20,24);	
				var responseData = ('0501'+serial_number);
				error_check = crc16(responseData);
				responseData = new Buffer('7878'+responseData+error_check+'0D0A','hex');
				socket.write(responseData);
			}
			else if( protocol == MSG_LOCATION_DATA )
			{
				/*
					1. define all variables
					2. save the hex values in the variables
					3. convert the hex values to corresponding decimal values
					4. store in database
					5. return response packet
					example : 7878 1f 12 0f0a0817090c c7 0167a20b 089a7813 00 1415019400007e0066d30011b8070d0a
				*/
				//calculated time
				var year	= '20'+parseInt(das.slice(0,2),16);
				var month 	= parseInt(das.slice(2,4),16);
				var day 	= parseInt(das.slice(4,6),16);
				var hour 	= parseInt(das.slice(6,8),16);
				var minute 	= parseInt(das.slice(8,10),16);
				var second 	= parseInt(das.slice(10,12),16);
				var dateObject = new Date(year,month,day,hour,minute,second,'00');
				//remove the time part
				//removed the 17th character coz 17,18 stands for quantity of GPS,and we only need 18th character. hence.
				das = das.slice(13,das.length);
				var noOfSatellites = parseInt(das[0],16);
				das = das.slice(1,das.length);
				var lat 		= hexToLatLong('0x'+(das.slice(0,8)));
				var longitude 	= hexToLatLong('0x'+(das.slice(8,16)));
				//remove lat and long bytes
				das = das.slice(16,das.length);

				var speed = parseInt(das.slice(0,2),16);

				//remove speed and course. Course nt done
				das = das.slice(6,das.length);

				var mcc = parseInt(das.slice(0,4),16);
				//remove mcc
				das = das.slice(4,das.length);
				var mnc = das.slice(0,2);
				//removed mnc and lac. lac nt done
				das = das.slice(6,das.length);

				var cellId = parseInt(das.slice(0,6),16);
				das = das.slice(0,6);

				serial_number = das.slice(0,2);

				
				var query = "INSERT INTO ?? (??,??,??,??,??,??,??,??,??,??,??) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
				var values = [	'device_info',
								'created_at','imei','lat','long','speed','course','mcc','mnc','lac','cell_id','server_time',
								dateObject,imei,lat,longitude,speed,,mcc,mnc,,cellId,new Date()
							];
				var query = connection.query(connection.format(query, values), function(err,result,tableInfo){
				});

			}
			else if( protocol == MSG_STATUS )
			{
				var responseData = ('0513'+serial_number);
				error_check = crc16(responseData);
				responseData = new Buffer('7878'+responseData+error_check+'0D0A','hex');
				socket.write(responseData);
			}	
	    }

				
	});
}).listen(8000);



/**
* CRC functions
*/
function crc16(buf)
{

    var crcTable = 
    [
        0X0000, 0X1189, 0X2312, 0X329B, 0X4624, 0X57AD, 0X6536, 0X74BF, 0X8C48, 0X9DC1, 0XAF5A, 
        0XBED3, 0XCA6C, 0XDBE5, 0XE97E, 0XF8F7, 0X1081, 0X0108, 0X3393, 0X221A, 0X56A5, 0X472C, 
        0X75B7, 0X643E, 0X9CC9, 0X8D40, 0XBFDB, 0XAE52, 0XDAED, 0XCB64, 0XF9FF, 0XE876, 0X2102, 
        0X308B, 0X0210, 0X1399, 0X6726, 0X76AF, 0X4434, 0X55BD, 0XAD4A, 0XBCC3, 0X8E58, 0X9FD1, 
        0XEB6E, 0XFAE7, 0XC87C, 0XD9F5, 0X3183, 0X200A, 0X1291, 0X0318, 0X77A7, 0X662E, 0X54B5, 
        0X453C, 0XBDCB, 0XAC42, 0X9ED9, 0X8F50, 0XFBEF, 0XEA66, 0XD8FD, 0XC974, 0X4204, 0X538D, 
        0X6116, 0X709F, 0X0420, 0X15A9, 0X2732, 0X36BB, 0XCE4C, 0XDFC5, 0XED5E, 0XFCD7, 0X8868, 
        0X99E1, 0XAB7A, 0XBAF3, 0X5285, 0X430C, 0X7197, 0X601E, 0X14A1, 0X0528, 0X37B3, 0X263A, 
        0XDECD, 0XCF44, 0XFDDF, 0XEC56, 0X98E9, 0X8960, 0XBBFB, 0XAA72, 0X6306, 0X728F, 0X4014, 
        0X519D, 0X2522, 0X34AB, 0X0630, 0X17B9, 0XEF4E, 0XFEC7, 0XCC5C, 0XDDD5, 0XA96A, 0XB8E3, 
        0X8A78, 0X9BF1, 0X7387, 0X620E, 0X5095, 0X411C, 0X35A3, 0X242A, 0X16B1, 0X0738, 0XFFCF, 
        0XEE46, 0XDCDD, 0XCD54, 0XB9EB, 0XA862, 0X9AF9, 0X8B70, 0X8408, 0X9581, 0XA71A, 0XB693, 
        0XC22C, 0XD3A5, 0XE13E, 0XF0B7, 0X0840, 0X19C9, 0X2B52, 0X3ADB, 0X4E64, 0X5FED, 0X6D76, 
        0X7CFF, 0X9489, 0X8500, 0XB79B, 0XA612, 0XD2AD, 0XC324, 0XF1BF, 0XE036, 0X18C1, 0X0948, 
        0X3BD3, 0X2A5A, 0X5EE5, 0X4F6C, 0X7DF7, 0X6C7E, 0XA50A, 0XB483, 0X8618, 0X9791, 0XE32E, 
        0XF2A7, 0XC03C, 0XD1B5, 0X2942, 0X38CB, 0X0A50, 0X1BD9, 0X6F66, 0X7EEF, 0X4C74, 0X5DFD, 
        0XB58B, 0XA402, 0X9699, 0X8710, 0XF3AF, 0XE226, 0XD0BD, 0XC134, 0X39C3, 0X284A, 0X1AD1, 
        0X0B58, 0X7FE7, 0X6E6E, 0X5CF5, 0X4D7C, 0XC60C, 0XD785, 0XE51E, 0XF497, 0X8028, 0X91A1, 
        0XA33A, 0XB2B3, 0X4A44, 0X5BCD, 0X6956, 0X78DF, 0X0C60, 0X1DE9, 0X2F72, 0X3EFB, 0XD68D, 
        0XC704, 0XF59F, 0XE416, 0X90A9, 0X8120, 0XB3BB, 0XA232, 0X5AC5, 0X4B4C, 0X79D7, 0X685E, 
        0X1CE1, 0X0D68, 0X3FF3, 0X2E7A, 0XE70E, 0XF687, 0XC41C, 0XD595, 0XA12A, 0XB0A3, 0X8238, 
        0X93B1, 0X6B46, 0X7ACF, 0X4854, 0X59DD, 0X2D62, 0X3CEB, 0X0E70, 0X1FF9, 0XF78F, 0XE606, 
        0XD49D, 0XC514, 0XB1AB, 0XA022, 0X92B9, 0X8330, 0X7BC7, 0X6A4E, 0X58D5, 0X495C, 0X3DE3, 
        0X2C6A, 0X1EF1, 0X0F78
    ];
    var crcX = parseInt("FFFF",16);
    var cr1 = parseInt("FF",16);
    var cr2 = parseInt("FFFF",16);
    var i = 0;

    while(i < buf.length)
    {
        str = buf.substring(i,i+2);
        str_hex = parseInt(str,16);
        j = (crcX ^ str_hex) & cr1;
        crcX = (crcX >> 8) ^ crcTable[j] ;
        i = i + 2;
    }
    crcX = crcX ^ 0xffff;
    return crcX.toString(16);
}

/**
* Hex to lat and longitude
*/

function hexToLatLong (hexValue) {
	return(hexValue/(60 * 30000.0));
}