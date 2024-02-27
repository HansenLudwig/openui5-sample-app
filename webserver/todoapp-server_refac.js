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

const datafile_framework = __dirname + '\\data\\todoodata.json';
const datafile_units = __dirname + '\\data\\todoslist.json';

let _main_key_time = JSON.stringify(new Date()).slice(1, -1);
let _main_key_id = 0;

let global_data_frame = require(datafile_framework);
const global_data_list = require(datafile_units).todos;

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
        case 'remove':
        case 'delete':
        case 'del':
            _data = _delData(params.data);
            break;
        case 'change':
            _data = _changeData(params.data);
            break;
        case 'overwrite':
        case 'over_write':
            _data = {Status: 1, Error: 'Access denied.'} // furture: overwrite should no longer be allowed.
            //global_data_frame = params.data;
            //global_data_list = global_data_frame.todos;
            //global_data_frame.todos = [];
            //_data = _saveData("data");
            break;
        case 'pre_load':
        case 'pre-load':
            _data.Status = 0;
            _data.Data = Object.assign({}, global_data_frame);
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
        res_data.data = global_data_frame;
        res_data.data.todos = global_data_list;
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
{   /* generate a ID according to Loacal time and make no dupicated ID with additional number attached to time
    Used: Only by _addData2RAM()
    Input: newTodo={title:'String', ...todoObj_WITHOUT_id}
    Output: no return, but newTodo.setNewProperty('id', _newId=Time+Sd)*/
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

function _addData2RAM(newTodo)
{   /* Input: newTodo={title:'', id:'', ...todoObj}
    Output: return_obj={Status:0(OK)|1(Failed), newId:''}*/
    const add_return = {"Status": 1, Data: []};
    try {
        if (_todoAssertion(newTodo)) { //assert(_todoAssertion(newTodo));
            throw new Error("IllegalTodoDataFormats"); }
        _genId(newTodo)
        global_data_list.push(newTodo);
        if ( _saveData('data').Status ) {
            throw new Error('DataSaveFailed'); }
        add_return.Data = newTodo.id;
        add_return.Status = 0;
    }
    catch (error)
    {
        add_return.Status = 1;
        add_return.Error = todosList.Error || "UnknownErrorWhenLoadingData"
    }
    return add_return;
}

function _delData(todoIds)
{   /* Input: todoIds = [{id:1}, ...Objs]
    Output: return_obj={Status: 0(success)|1(404), Error:'Err msg.'} */
    let i = global_data_list.length;
    const _list_size = todoIds.length;
    let _flag_finded = 0;
    while(i--) {
        let j = todoIds.length;
        while(j--) {
            if(global_data_list[i].id === todoIds[j].id) {
                global_data_list.splice(i, 1);
                todoIds.splice(j, 1);
                _flag_finded++;
                break;
            }
        }
    }
    if (_flag_finded === _list_size) {
        _saveData();
        return {Status: 0, Data:[]}; }
    else {
        _missed = String(_list_size - _flag_finded);
        return {Status: 1, Data:todoIds, Error:_missed+'Element(s) not found.'};}
}
function _changeData(todoIds)
{   /* Input todoIds = [{id:1, otherProperty1:'', ...}, ...Objs]
    Output: return_obj={Status: 0(success)|1(404), Error:'Err msg.'} */
    const changeProperties = Object.keys(todoIds[0]);
    const _list_size = todoIds.length;
    let i = changeProperties.length;
    let _flag_finded = 0;
    while(i--){
        if (changeProperties[i] === 'id') {
            changeProperties.splice(i, 1);
            break;  // only 1 'id' in the properties, save some time.
        }
    }
    global_data_list.forEach( (todo) => {
        let i = todoIds.length
        while(i--){
            if (todo.id === todoIds[i].id) {
                changeProperties.forEach( (_ppt) => {
                    todo[_ppt] = todoIds[i][_ppt];
                    todoIds.splice(i, 1);
                    _flag_finded++;
                })
            }
        }
    });

    if (_flag_finded === _list_size) {
        _saveData()
        return {Status: 0, Data:[]}; }
    else {
        _missed = String(_list_size - _flag_finded);
        return {Status: 1, Data:todoIds, Error:_missed+'Element(s) not found.'};}
}

function _loadAndParseTodos()  // Only used when Initiating the server.
{   /* Input: nothing
        Using: global_data_list={todos:[Array]}
    Output: Obj: { Status:0(OK)|1(Failed), todos: [Array-of-Todos] } */
    const lnp_return = {Status: 1, todos: []};
    try {
        const todosList = require(datafile_units);  //{todos:[todosArr]}
        const todosArr = todosList.todos;         // [Array: {}*n]
        todosArr.forEach( (todo) => { 
            todo.DDLAtUTC = Date(todo.DDLAtUTC);
            todo.addedAtUTC = Date(todo.addedAtUTC);
        } );
        lnp_return.Status = 0;
        lnp_return.todos = todosArr;
    }
    catch (error)
    {
        lnp_return.Status = 1;
        lnp_return.Error = todosList.Error || "UnknownErrorWhenLoadingData"
    }
    return lnp_return;
}

function _stringifyTodos(todoList='')
{   /* Input: todoList=undefined/String // data in RAM;
                        or =[Array]or{Object}// inputed Obj/Array data
      Output: String(str_todos = {todos:[{//todo}, ...]})*/
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
            _list = todoList; }
    }
    _list.forEach( (todo) => {
        todo.DDLAtUTC = JSON.stringify(todo.DDLAtUTC).slice(1,-1);
        todo.addedAtUTC = JSON.stringify(todo.addedAtUTC).slice(1,-1);
    });
    str_todos.todos = _list;
    return JSON.stringify(str_todos, null, 4);
}

function _saveData(content='whole')
{   /* Input: content='Saving Options'
            = 'whole' | 'headeronly' | 'list'/'data'
    Output: return_obj={Status: 0|1, Error:'Err msg'} */
    const fs = require('fs');
    if( typeof(content) === typeof('String') ) {
        content = content.toLowerCase()
    }
    let save_return = {Status: 1, Error:''};    // Failed.

    try {
        let save_CallBack = (err) => {
            if (err) throw err;
        }
        const data_struct = {"todos": []};
        switch (content){
            default:
            case 0:
            case "whole":
                _data_list = _stringifyTodos(global_data_list);
                fs.writeFileSync(datafile_units, _data_list, save_CallBack);
                fs.writeFileSync(datafile_framework, JSON.stringify(global_data_frame, null, 4), save_CallBack);
                break;

            case 1:
            case "headeronly":
            case "withoutdata":
                fs.writeFileSync(datafile_framework, JSON.stringify(global_data_frame, null, 4), save_CallBack);
                break;

            case 2:
            case "list":
            case "data":
                _data_list = _stringifyTodos(global_data_list);
                fs.writeFileSync(datafile_units, _data_list, save_CallBack);
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
{   /* Input: todo = {title:'', ...} 
    Output: checkResult = true/false */
    const checkList = {"lengthCheck":true, "propertyCheck": true};
    const checkListIdx = Object.keys(checkList);
    
    // check length
    if ( (JSON.stringify(todo).length > 2) ) { // '{}' === 2
        return false; }
    // check property
    propertyCheckList = ['title', 'hashTag', 'completed', 'priority', 'DDLAtUTC', 'addedAtUTC', 'id'];
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