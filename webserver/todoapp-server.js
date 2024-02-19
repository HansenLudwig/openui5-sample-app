const express = require("express");
const { ok } = require("assert");

var bodyParser = require('body-parser')

const XMLHttpRequest = require('xhr2');
const { error } = require("console");

const app = express();

const cors = require('cors');
const { type } = require("os");
app.use( cors({
    origin: '*'
}) )

app.use(bodyParser.json())
app.use( bodyParser.urlencoded({extended: false}) )

const port = 3000;
app.use("/", express.static("../webserver"))
console.log(__dirname);

const data_framework = './data/todoodata.json';
const data_units = './data/todoslist.json';

let _main_key_time = JSON.stringify(new Date()).slice(1, -1);
let _main_key_id = 0;

let global_data_frame = require(data_framework);
const global_data_list = _getParsedTodos().Data;

app.post('/todoapp', (req, res) =>
{   /*接收req.body.xxx*/ 
    const params = req.body;
    const operation = params.operation.toLowerCase();

    res.setHeader('access-control-allow-origin', 'http://localhost:8192');
    res.setHeader('access-control-allow-headers', 'Content-Type');
    
    const res_data = {"Status": 0, "data":{}, "msg":""}
    let _data = {Status:1};
    switch (operation) {
        case 'add':
            _data = _addData2RAM(params.data);
            break;
        case 'del':
            _data = _delData(params)
            break;
        case 'completed':
            break;
        case 'overwrite':
        case 'over_write':
            //_data = {Status: 1, Error: 'Access denied.'} // furture: overwrite should no longer be allowed.
            _data = _saveData(params.data, "data");
            break;
        case 'pre_load':
        case 'pre-load':
            _data.Status = 0;
            _data.Data = global_data_frame;
            _data.Data.todos = global_data_list;
            break;
        case 'ask':
        default:
            _data = {Status:0, Data:global_data_list};
            // _data = _loadData('list'); // {Status:0/1, Data:[]}
            break;
    }
    if (_data.Status) {
        res_data.Status = 400;
        res_data.msg = _data.Error;
        res_data = _getParsedTodos().Data;
    } else {
        res_data.Status = 200; // 202; // Accepted indicates that the request has been accepted
                                // for processing, but the processing has not been completed;
                               // in fact, processing may not have started yet.
        res_data.data = _data.Data;
    }
    res.send(res_data);
    return
} )

app.get('/todoapp', (req, res)=>{
    console.log('CANNOT GET.')
}
);


app.listen(port, () => {
    console.log(`App Server listening on port ${port}`);
});

function _genId(newTodo)
{
    const _addedTime = newTodo.addedAtUTC;
    if (_addedTime >= _main_key_time)
    {
        _main_key_time = JSON.stringify(new Date()).slice(1, -1);
        _main_key_id = 0;
    } else {
        _main_key_id += 1;
    }
    newTodo.id = (_main_key_time + String(_main_key_id));
}

function _addData(newTodo)
{   /* Add a new Todo to ./todoitems.json and return feedback
    Inputs: newTodo: an Obj of Todo
    Outputs: Obj: { Status:0(OK)/1(Failed), Data: (Optional)Array } */
    const add_return = {"Status": 1, Data: []};
    try {
        const todosList = _loadData("data");  // {"Status":0, "data":{"todos":[Array]}}
        if (_todoAssertion(newTodo)) { //assert(_todoAssertion(newTodo));
            throw new Error("IllegalTodoDataFormats"); }
        if (todosList.Status) {
            throw new Error('DataLoadFailed'); }
        todos = todosList.Data.todos;         // [Array: {}*n]
        _genId(newTodo)
        todos.push(newTodo);
        if ( _saveData(todos, 'data').Status ) {
            throw new Error('DataSaveFailed'); }
        add_return.Status = 0;
    }
    catch (error)
    {
        add_return.Status = 1;
        add_return.Error = todosList.Error || "UnknownErrorWhenLoadingData"
    }
    return add_return;
}

function _addData2RAM(newTodo)
{
    try {
        if (_todoAssertion(newTodo)) { //assert(_todoAssertion(newTodo));
            throw new Error("IllegalTodoDataFormats"); }
        todos = global_data_list;
        _genId(newTodo)
        todos.push(newTodo);
        if ( _saveData(todos, 'data').Status ) {
            throw new Error('DataSaveFailed'); }
        add_return.newId = newTodo.id;
        add_return.Status = 0;
    }
    catch (error)
    {
        add_return.Status = 1;
        add_return.Error = todosList.Error || "UnknownErrorWhenLoadingData"
    }
    return add_return;
}

function _delData(todoId)
{
    let i = global_data_list.length;
    let _flag_finded = 0;
    while(i--) {
        if(global_data_list[i] === todoId) {
            global_data_list.splice(i, 1);
            _flag_finded++;
        }
    }
    if (_flag_finded) {
        return {Status: 0, Data:[]}; }
    else {
        return {Status: 1, Data:[], Error:'Element not found.'}; }
}

function _getParsedTodos()
{   /* Read ./todoslist.json from file, TODOs_only!
    Outputs: Obj: { Status:0(OK)/1(Failed), Data: [Array-of-Todos] } */
    const read_return = {Status: 1, Data: []};
    try {
        // 【】【】
        // const todosList = require(data_units);  // {"todos":[Array]}
        // const todos = todosList.todos;  // [Array: {}*n]
        const todosList = _loadData("data");  // {"Status":0, "data":{"todos":[Array]}}
        if (todosList.Status) {
            throw new Error(todosList.Error) }
        todos = todosList.Data.todos;         // [Array: {}*n]
        todos.forEach( (todo) => { 
            todo.DDLAtUTC = Date(todo.DDLAtUTC);
            todo.addedAtUTC = Date(todo.addedAtUTC);
        } );
        read_return.Status = 0;
        read_return.Data = todos;
    }
    catch (error)
    {
        read_return.Status = 1;
        read_return.Error = todosList.Error || "UnknownErrorWhenLoadingData"
    }
    return read_return;
}

function _stringifyTodos(todoList='')
{   /* Input: todoList: Nothing/String: use data in RAM; [Array]or{Object}: use inputed data
      Output: str_todos = {todos:[{//todo}, ...]}*/
    const str_todos = {todos:[]};
    let _list = [];
    if (typeof(todoList) === typeof('String'))
    {   // RAM
        _list = global_data_list; // ['array']
    }
    else if (typeof(todoList) === typeof(['Object'])) 
    {   // Input Config
        if('todos' in todoList) {   // {isObject:true, todos:[]}
            _list = todoList.todos;
        } else {    // ['array']
            _lit = todoList; }
    }
    _list.forEach( (todo) => {
        todo.DDLAtUTC = JSON.stringify(todo.DDLAtUTC).slice(1,-1);
        todo.addedAtUTC = JSON.stringify(todo.addedAtUTC).slice(1,-1);
    });
    str_todos.todos = _list;
    return str_todos;
}

function _loadData(content="whole")
{   /*  Read .json files
        Outputs: load_return= {Status: 0, Data:{ it depends. }} */
    if( typeof(content) === typeof("String") ) {
        content = content.toLowerCase()
    }
    const load_return = {"Status": 1, Data: {}}
    try {
        let todoItems = {};
        switch (content){
            default:    // The default case does NOT have to be the last case in a switch block. by W3School.
            case 0:
            case "whole":
                todoItems = require(data_framework);
                todoItems.todos = require(data_units).todos;
                load_return.Data = todoItems;
                break;

            case 1:
            case "headeronly":
            case "withoutdata":
                todoItems = require(data_framework);
                load_return.Data = todoItems;
                break;

            case 2:
            case "list":
            case "data":
                const todosList = require(data_units);
                load_return.Data = todosList;
                break;
        }   // switch(content)
        load_return.Status = 0; // OK
    }
    catch (error)
    {
        load_return.Data = [];
        load_return.Status = 1;
        load_return.Error = "DataLoadFailed"
    }
    return load_return;
}

function _saveData(_data, content="whole")
{
    const fs = require('fs');
    if( typeof(content) === typeof("String") ) {
        content = content.toLowerCase()
    }
    let save_return = {"Status": 1, "Error":""};    // Failed.
    
    const data_framework = './webserver/data/todoodata.json';
    const data_units = './webserver/data/todoslist.json';

    try {
        let save_CallBack = (err) => {
            if (err) throw err;
        }
        const data_struct = {"todos": []};
        switch (content){
            default:
            case 0:
            case "whole":
                data_struct.todos = _stringifyTodos(_data.todos);
                fs.writeFileSync(data_units, JSON.stringify(data_struct, null, 4), save_CallBack);
                _data.todos = [];
                fs.writeFileSync(data_framework, JSON.stringify(_data, null, 4), save_CallBack);
                break;

            case 1:
            case "headeronly":
            case "withoutdata":
                _data.todos = [];   // Optional.
                fs.writeFileSync(data_framework, JSON.stringify(_data, null, 4), save_CallBack);
                break;

            case 2:
            case "list":
            case "data":
                data_struct.todos = _stringifyTodos(_data);
                fs.writeFileSync(data_units, JSON.stringify(data_struct, null, 4), save_CallBack);
                break;
        }
        save_return.Status = 0;
    }
    catch (error)
    {
        save_return.Status = 1;
        save_return.Error = "DataSaveFailed";
    }
    return save_return;
}

function _todoAssertion(todo)
{
    const checkList = {"lengthCheck":true, "propertyCheck": true};
    const checkListIdx = Object.keys(checkList);
    
    // check length
    if ( (JSON.stringify(todo).length > 2) ) { // '{}' === 2
        return false; }
    // check property
    propertyCheckList = ["title", "hashTag", "completed", "priority", "DDLAtUTC", "addedAtUTC"];
    propertyCheckList.forEach((necessaryProperty) => {
        checkList.propertyCheck = checkList.propertyCheck && (necessaryProperty in todo); });

    /*  ---------------------  *
        add other checks here. 
     *  ---------------------  */

    // check all at the end
    let checkResult = true
    checkListIdx.forEach((check) => {
        checkResult = checkResult && checkList[check]; });

    return checkResult;     // for Assert(checkResult) outside the Fn.
}