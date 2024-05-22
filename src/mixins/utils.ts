import {month} from "@/utils/utils";

const utils = {
    methods: {
        formatDate(startDate: string, endDate: string): string {
            if(startDate.substring(5,7) != endDate.substring(5,7)){
                return `${startDate.substring(8)} ${month[parseInt(startDate.substring(5,7))-1]} - ${endDate.substring(8)} ${month[parseInt(endDate.substring(5,7))-1]}`;
            } else {
                return startDate.substring(8) + '-' + endDate.substring(8) + ' ' + month[parseInt(endDate.substring(5,7))-1]
            }
        },
        getDateFormatted(date: string): string[] {
            const toReturn = [];
            if(date != "") {
                toReturn.push(month[parseInt(date.substring(5,7))-1]);
                toReturn.push(date.substring(8));
            } else {
                toReturn.push("JAN","01");
            }
            return toReturn;
        }
    }
}

export default utils;