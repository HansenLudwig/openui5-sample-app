sap.ui.define([
	"sap/ui/Device",
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/ui/unified/DateTypeRange",
	"sap/ui/core/date/UI5Date",
	'../model/formatter',
	'../model/prioritylist'
], (Device, Controller, Filter, FilterOperator, JSONModel, DateTypeRange, UI5Date, formatter, prioritylist) => {
	"use strict";

	return Controller.extend("sap.ui.demo.todo.controller.App", {
		formatter: formatter,

		onInit() {

			let oModel = new JSONModel();
			
			const oOptions = {
				"SelectedOption": "Normal(Default)",
				"OptionCollection": [
					{
						"PriorityID": "5",
						"PriName": "Top",
						"Icon": "sap-icon://add-product"
					},
					{
						"PriorityID": "4",
						"PriName": "High",
						"Icon": "sap-icon://add-product"
					},
					{
						"PriorityID": "3",
						"PriName": "Normal(Default)",
						"Icon": "sap-icon://add-product"
					},
					{
						"PriorityID": "2",
						"PriName": "Low",
						"Icon": "sap-icon://add-product"
					},
					{
						"PriorityID": "1",
						"PriName": "Very Low",
						"Icon": "sap-icon://add-product"
					}
				]
			};
			const ogpOptions = {
				OptionCollection: [
					{
						groupingID: '1',
						groupingName: 'Priority'
					},
					{
						groupingID: '2',
						groupingName: 'Added'
					},
					{
						groupingID: '3',
						groupingName: 'DDL'
					},
					{
						groupingID: '4',
						groupingName: 'HashTag'
					}
				]
			};

			this.aSearchFilters = [];
			this.aTabFilters = [];
			this.aHashTagFilters = [];

			oModel.setData({
				isMobile: Device.browser.mobile,
				selectOptions: oOptions,	// prioritylist
				//valueDP1: UI5Date.getInstance(),
				ogpOptions: ogpOptions,
				filterText: undefined
			});

			this.getView().setModel(oModel, 'view');
			this.getView().getModel().setProperty("/default_newTodo/DDLAtUTC", JSON.stringify(UI5Date.getInstance()).slice(1,-1));
			this.getView().getModel().setProperty("/newTodo/DDLAtUTC", JSON.stringify(UI5Date.getInstance()).slice(1,-1));
			
			this._front2server('pre_load');
		},

		/**
		 * Adds a new todo item to the bottom of the list.
		 */
		addTodo() {
			const oModel = this.getView().getModel();
			if(!oModel.getProperty("/newTodo/title"))
			{
				return
			}
			
			const aTodos = oModel.getProperty('/todos').map((oTodo) => Object.assign({}, oTodo));

			const newTodo = oModel.getProperty("/newTodo")
			const defaultNewTodo = oModel.getProperty("/default_newTodo")
			let newTodoHashTagIdx = String(newTodo.title).search("#")
			if(newTodoHashTagIdx === -1) {
				newTodoHashTagIdx = String(newTodo.title).length
			}
			const newTodoTitle = newTodo.title.substring(0, newTodoHashTagIdx)
			const newTodoHashTag = newTodo.title.substring(newTodoHashTagIdx)
			const newTodoDDL = Date(newTodo.DDLAtUTC)	// Questionable...
			const newTodoObject = {
				title: newTodoTitle,
				hashTag: newTodoHashTag,
				completed: false,
				priority: newTodo.priority,  //newTodoPriorityIndex[newTodo.priority],
				DDLAtUTC: newTodoDDL,
				addedAtUTC: new Date(),
			}
			const server_res = this._front2server('add', newTodoObject, {'oModel':oModel, 'aTodos':aTodos, 'defaultNewTodo':defaultNewTodo});
		},

		onCompletedClick(oEvent)
		{	//
			// this._front2server('overwrite', aTodos, {'oModel':oModel});
			let changed_Checkbox_idx = oEvent.getSource().mBindingInfos.selected.binding.oContext.sPath.split('/')[2];
			changed_Checkbox_idx = parseInt(changed_Checkbox_idx);
			const oModel = this.getView().getModel();
			const aTodos = oModel.getProperty('/todos').map((oTodo) => Object.assign({}, oTodo));
			const cTodo = aTodos[changed_Checkbox_idx];
			this._front2server('change', [{id:cTodo.id, completed:cTodo.completed}]);
			// this._front2server('completed', )
		},

		/**
		 * Removes all completed items from the todo list.
		 */
		clearCompleted(oEvent) {
			const oModel = this.getView().getModel();
			const aTodos = oModel.getProperty("/todos").map((oTodo) => Object.assign({}, oTodo));

			let i = aTodos.length;
			const del_list = [];
			while (i--) {
				const oTodo = aTodos[i];
				if (oTodo.completed) {
					del_list.push({id:oTodo.id});
					aTodos.splice(i, 1);
				}
			}
			if (del_list.length)
			{
				this._front2server('del', del_list, {'oModel':oModel});
				oModel.setProperty("/todos", aTodos);
			}
		},

		/**
		 * Updates the number of items not yet completed
		 */
		updateItemsLeftCount() {
			const oModel = this.getView().getModel();
			const aTodos = oModel.getProperty("/todos") || [];

			const iItemsLeft = aTodos.filter((oTodo) => oTodo.completed !== true).length;

			oModel.setProperty("/itemsLeftCount", iItemsLeft);
		},
		pressOnHashTag(oEvent) {
			const SearchHashTag = oEvent.getSource().mProperties.text.substring(1)

			const oModel = this.getView().getModel();
			// First reset current filters
			if(this.aHashTagFilters.length){
				this.aHashTagFilters = [];
				oModel.setProperty("/itemsRemovable", true);
			}
			else {
				this.aHashTagFilters = [];
				if (SearchHashTag && SearchHashTag.length > 0) {
					oModel.setProperty("/itemsRemovable", false);
					const filter = new Filter("hashTag", FilterOperator.Contains, SearchHashTag);
					this.aHashTagFilters.push(filter);
				} else {
					oModel.setProperty("/itemsRemovable", true);
				}
			}

			this._applyListFilters();
		},
		clearHashTagFilter(oEvent) {
			const oModel = this.getView().getModel();
			this.aHashTagFilters = [];
			oModel.setProperty("/itemsRemovable", true);
			this._applyListFilters();
		},
		/**
		 * Trigger search for specific items. The removal of items is disable as long as the search is used.
		 * @param {sap.ui.base.Event} oEvent Input changed event
		 */
		onSearch(oEvent) {
			const oModel = this.getView().getModel();

			// First reset current filters
			this.aSearchFilters = [];

			// add filter for search
			this.sSearchQuery = oEvent.getSource().getValue();
			if (this.sSearchQuery && this.sSearchQuery.length > 0) {
				oModel.setProperty("/itemsRemovable", false);
				if ( this.sSearchQuery[0] === '#' ) {
					this.aHashTagFilters = [];
					if (this.sSearchQuery.length > 1)
					{
						const filter = new Filter("hashTag", FilterOperator.Contains, this.sSearchQuery.substring(1));
						this.aHashTagFilters.push(filter);			
					}
				}
				else {
					const filter = new Filter("title", FilterOperator.Contains, this.sSearchQuery);
					this.aSearchFilters.push(filter);
				}
			} else {
				this.aSearchFilters = [];
				this.aHashTagFilters = [];
				oModel.setProperty("/itemsRemovable", true);
			}

			this._applyListFilters();
		},

		onFilter(oEvent) {
			// First reset current filters
			this.aTabFilters = [];

			// add filter for search
			this.sFilterKey = oEvent.getParameter("item").getKey();

			// eslint-disable-line default-case
			switch (this.sFilterKey) {
				case "active":
					this.aTabFilters.push(new Filter("completed", FilterOperator.EQ, false));
					break;
				case "completed":
					this.aTabFilters.push(new Filter("completed", FilterOperator.EQ, true));
					break;
				case "all":
				default:
					// Don't use any filter
			}

			this._applyListFilters();
		},

		_applyListFilters() {
			const oList = this.byId("todoList");
			const oBinding = oList.getBinding("items");

			oBinding.filter(this.aSearchFilters.concat(this.aTabFilters).concat(this.aHashTagFilters), "todos");

			let sI18nKey;
			if (this.sFilterKey && this.sFilterKey !== "all") {
				if (this.sFilterKey === "active") {
					sI18nKey = "ACTIVE_ITEMS";
				} else {
					// completed items: sFilterKey = "completed"
					sI18nKey = "COMPLETED_ITEMS";
				}
				if (this.sSearchQuery) {
					sI18nKey += "_CONTAINING";
				}
			} else if (this.sSearchQuery) {
				sI18nKey = "ITEMS_CONTAINING";
			}

			let sFilterText;
			if (sI18nKey) {
				const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
				sFilterText = oResourceBundle.getText(sI18nKey, [this.sSearchQuery]);
			}

			this.getView().getModel("view").setProperty("/filterText", sFilterText);
		},

		_parseAndSetTodos(_data, struct='data') {
			
		},

		_stringifyTodos(todosArr)
		{	/* Input: todos: Array of Objs
			 Output: Objs.date -> Date(date) */
			 todosArr.forEach( (todo) => { 
				todo.DDLAtUTC = Date(todo.DDLAtUTC);
				todo.addedAtUTC = Date(todo.addedAtUTC);
			});
		},

		_front2server(operation='ask', send_data={}, oParam={})
		{
			let fn_return = { Status: 400, data:{}, msg: {} };
			if (operation === 'add') {
				send_data.DDLAtUTC = JSON.stringify(send_data.DDLAtUTC).slice(1,-1);	//
				send_data.addedAtUTC = JSON.stringify(send_data.addedAtUTC).slice(1,-1);
			}
			fn_return = this._front2server_transm(operation, send_data).then( (server_res) => {
				const server_return = { Status: 400, data:{}, msg: {} };
				if (String(server_res.Status) === '200') {
					operation = operation.toLowerCase();
					switch (operation) {
						case 'pre_load':
						case 'pre-load':
						case 'ask':
							const server_data = server_res.data;  // to-be tested: ser_res.data_consistency
							const server_todos = server_data.todos;
							server_todos.forEach( (todo) => {
								todo.DDLAtUTC = Date(todo.DDLAtUTC);
								todo.addedAtUTC = Date(todo.addedAtUTC);
							} );
							this.getView().getModel().setProperty('/todos', server_data.todos);
							if (operation ==='pre_load' || operation === 'pre-load')
							{
								server_data.newTodo.addedAtUTC = new Date();
								server_data.default_newTodo.addedAtUTC = new Date(); 
								this.getView().getModel().setProperty('/default_newTodo', server_data.default_newTodo);
								this.getView().getModel().setProperty('/newTodo', server_data.newTodo);
							}
							server_return.data = server_data;
							break;
						case 'add':
							// {oModel, aTodos, defaultNewTodo}
							const oModel = oParam.oModel;
							send_data.id = server_res.data;
							send_data.addedAtUTC = Date(send_data.addedAtUTC);
							oParam.aTodos.push(send_data);
							oModel.setProperty('/todos', oParam.aTodos);
							oModel.setProperty('/newTodo', oParam.defaultNewTodo);
							break;
						case 'change':
							// see if there is a block necessary here.
							break;
						case 'overwrite':
							if (server_res.Status === 200)
							{	// {oModel}
								oParam.oModel.setProperty('/todos', send_data);
							}
							else {
								MessageBox.error('Failed transmission with the server, please try again later.');
							}
							break;

					}
				}
				else {
					console.error('Error: Failed to load data from the server.')
					// throw new Error('ServerError');
				}
			});
		},

		async _front2server_transm(operation='ask', send_data={}) {
			const server_add = "http://localhost";
			const server_port = "3000";
			const server_cd = "/todoapp";
			const sv_url = server_add + (server_port && ':') + server_port + server_cd;

			const httpPack = {
				method: "POST",
				mode: "cors",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify( 
					{
					"operation": operation,
					"data": send_data,	// newTodo
				} ),
				dataType: "json"
				/*
				success: function (data) {
					console.log(data);
				} */
			};
			const server_res = await fetch(sv_url, httpPack).catch( (err) => {
				console.error(err);
				return {Status: '500', Error: "Internal Server Error"}
			});

			const server_res_json = await server_res.json();	// {Status: 200, data: []}
			return server_res_json;
		}

	}); // Controller.extend

}); // sap.ui.define
