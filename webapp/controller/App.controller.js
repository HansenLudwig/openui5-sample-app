sap.ui.define([
	"sap/ui/Device",
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/ui/unified/DateTypeRange",	//
	"sap/ui/core/date/UI5Date",		//
	"../model/formatter"
], (Device, Controller, Filter, FilterOperator, JSONModel, DateTypeRange, UI5Date, formatter) => {
	"use strict";

	return Controller.extend("sap.ui.demo.todo.controller.App", {
		formatter: formatter,

		onInit() {

			let oModel = new JSONModel();
			
			let oOptions = {
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

			this.aSearchFilters = [];
			this.aTabFilters = [];

			oModel.setData({
				isMobile: Device.browser.mobile,
				selectOptions: oOptions,
				//valueDP1: UI5Date.getInstance(),
				filterText: undefined
			});

			this.getView().setModel(oModel, "view");
			// should do it on component level.
			this.getView().getModel().setProperty("/default_newTodo/DDLAtUTC", UI5Date.getInstance())
            this.getView().getModel().setProperty("/newTodo/DDLAtUTC", UI5Date.getInstance())
		},

		// Abort
		DPchange() {
			return 
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
			
			const aTodos = oModel.getProperty("/todos").map((oTodo) => Object.assign({}, oTodo));

			let DateofAddedUTC = UI5Date.getInstance()
			//'2024-1-16T03:29:42Z'

			// Hansen:
			// todo: add: Seleciton of priority:["Top", "High", "Normal(Default)", "Low", "Very Low"]
			// todo: fix the problem of Date(UTC...)
			const newTodo = oModel.getProperty("/newTodo")
			const defaultNewTodo = oModel.getProperty("/default_newTodo")
			let newTodoHashTagIdx = String(newTodo.title).search("#")
			if(newTodoHashTagIdx === -1) {
				newTodoHashTagIdx = String(newTodo.title).length
			}
			let newTodoTitle = newTodo.title.substring(0, newTodoHashTagIdx)
			let newTodoHashTag = newTodo.title.substring(newTodoHashTagIdx)
			let newTodoDDL = newTodo.DDLAtUTC
			aTodos.push({
				title: newTodoTitle,
				hashTag: newTodoHashTag,
				completed: false,
				priority: newTodo.priority,  //newTodoPriorityIndex[newTodo.priority],
				DDLAtUTC: newTodoDDL,
				addedAtUTC: DateofAddedUTC,
				//addedAt: Date(DateofAddedUTC)
			});

			oModel.setProperty("/todos", aTodos);
			oModel.setProperty("/newTodo", defaultNewTodo);
		},

		/**
		 * Removes all completed items from the todo list.
		 */
		clearCompleted() {
			const oModel = this.getView().getModel();
			const aTodos = oModel.getProperty("/todos").map((oTodo) => Object.assign({}, oTodo));

			let i = aTodos.length;
			while (i--) {
				const oTodo = aTodos[i];
				if (oTodo.completed) {
					aTodos.splice(i, 1);
				}
			}

			oModel.setProperty("/todos", aTodos);
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
			if(this.aSearchFilters.length){
				this.aSearchFilters = [];
			}
			else {
				this.aSearchFilters = [];
				if (SearchHashTag && SearchHashTag.length > 0) {
					oModel.setProperty("/itemsRemovable", false);
					const filter = new Filter("hashTag", FilterOperator.Contains, SearchHashTag);
					this.aSearchFilters.push(filter);
				} else {
					oModel.setProperty("/itemsRemovable", true);
				}
			}

			this._applyListFilters();
		},
		/**
		 * Trigger search for specific items. The removal of items is disable as long as the search is used.
		 * @param {sap.ui.base.Event} oEvent Input changed event
		 */
		onSearch(oEvent) {
			// Hansen:
			// To-do: Add search on HashTag, by starting with "#".
			const oModel = this.getView().getModel();

			// First reset current filters
			this.aSearchFilters = [];

			// add filter for search
			this.sSearchQuery = oEvent.getSource().getValue();
			if (this.sSearchQuery && this.sSearchQuery.length > 0) {
				oModel.setProperty("/itemsRemovable", false);
				const filter = new Filter("title", FilterOperator.Contains, this.sSearchQuery);
				this.aSearchFilters.push(filter);
			} else {
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

			oBinding.filter(this.aSearchFilters.concat(this.aTabFilters), "todos");

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

	});

});
