

sap.ui.define([], () => {
	"use strict";

	return {
		prioritylist()
        {
            return {
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
            }
        } // prioritylist()
	}; // return 
});