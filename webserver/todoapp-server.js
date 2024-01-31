const express = require("express");
const cors = require('cors');
const { ok } = require("assert");

var bodyParser = require('body-parser')

const XMLHttpRequest = require('xhr2')

const app = express();
//app.use(cors());  // ...

app.use(bodyParser.json())
app.use( bodyParser.urlencoded({extended: false}) )

const port = 3000;
app.use("/", express.static("../webserver"))
console.log(__dirname);

app.post('/post', (req, res) =>
{   /*接收req.body.xxx*/ 
    const params = req.body
    const operation = params.operation

    switch (operation) {
        case "Add":
            break;
        case "Del":
            break;
        case "Ask":
        default:
            Todos = _readData()
            oTodos = {...Todos}
            res.send(oTodos);
            break;
    }
} )


app.listen(port, () => {
    console.log(`App Server listening on port ${port}`);
});


_readData()
{
    const todoItems = require('./todoitems.json');
    const todos = todoItems.todos;
    todos.forEach( (me) => { 
        me.DDLAtUTC = Date(me.DDLAtUTC);
        me.addedAtUTC = Date(me.addedAtUTC);
    } )
    return todos;
}

