sap.ui.define([], () => {
	"use strict";

	return {
		priorityText(sPriority) {
			//const oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            const priority_list= {
                "5": "Top",
                "4": "High",
                "3": "Normal",
                "2": "Low",
                "1": "Very Low"
            }
            let _priority_Text = priority_list[sPriority]
            if(_priority_Text) {
                return _priority_Text
            }
            else {
                return "Undef.\nPrio."
            }
		}
	};
});