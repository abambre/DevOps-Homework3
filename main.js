var redis = require('redis')
var multer  = require('multer')
var express = require('express')
var httpProxy = require('http-proxy')
var fs      = require('fs')
var http = require('http');
var app = express()
// REDIS

var client = redis.createClient(6379, '127.0.0.1', {})

client.flushall();


///////////// WEB ROUTES

// Add hook to make it easier to get all visited URLS.
app.use(function(req, res, next) 
{
	console.log(req.method, req.url);

	if(req.url != "/recent")
	{	
		client.lpush("mylist",req.url);
		client.ltrim("mylist",0,4);
	}
	// ... INSERT HERE.

	next(); // Passing the request to the next handler in the stack.
});


app.post('/upload',[ multer({ dest: './uploads/'}), function(req, res){
   console.log(req.body) // form fields
   console.log(req.files) // form files

   if( req.files.image )
   {
	   fs.readFile( req.files.image.path, function (err, data) {
	  		if (err) throw err;
	  		var img = new Buffer(data).toString('base64');
	  		console.log(img);
	  		client.lpush("image",img);
		});
	}

   res.status(204).end()
}]);

app.get('/meow', function(req, res) {
	{
		//if (err) throw err
		
		/*items.forEach(function (imagedata) 
		{
   		res.write("<h1>\n<img src='data:my_pic.jpg;base64,"+imagedata+"'/>");
		});*/

		//client.lrange("imagelist",0,-1, function(err,value){ res.write("<h1>\n<img src='data:my_pic.jpg;base64,"+value+"'/>");} );
		client.lpop("image",function(err,value){  
			res.writeHead(200, {'content-type':'text/html'});
			console.log(value);
			res.write("<h1>\n<img src='data:my_pic.jpg;base64,"+value+"'/>");
			res.end();
		});

   		
	}
})

app.get('/set', function(req, res) {
  
  client.set("key", "this message will self-destruct in 10 seconds");
  client.expire("key",400);

  res.send('Setting value');

})

app.get('/get', function(req, res) {
 
  client.get("key", function(err,value){ res.send(value);} );

})

app.get('/recent', function(req, res) {
  

   client.lrange("mylist",0,-1, function(err,value){ res.send(value);} );

})

// HTTP SERVER
var server = app.listen(3000, function () {

  client.lpush("serving_ips", 'http://127.0.0.1:3000')
  var host = server.address().address
  var port = server.address().port
  //client.flushall();
  console.log('Example app listening at http://%s:%s', host, port)

})

// Running addtional server instance 
// HTTP SERVER
var server1 = app.listen(3001, function () {

  client.lpush("serving_ips", 'http://127.0.0.1:3001')

  var host = server1.address().address
  var port = server1.address().port
  //client.flushall();
  console.log('Example app listening at http://%s:%s', host, port)
})


//var TARGET   = 'http://127.0.0.1:3000';

// Proxy.
var options = {};
var proxy   = httpProxy.createProxyServer(options);

var proxy_server  = http.createServer(function(req, res){
    client.rpoplpush("serving_ips","serving_ips", function (err,value) {

    console.log(value)
    proxy.web( req, res, {target: value } );
    //console.log('Example app listening at http://%s:%s', host, port)
    })
 
});

proxy_server.listen(4000,function () {
  console.log('proxy server started  at http://%s:%s', proxy_server.address().address, proxy_server.address().port)
});
