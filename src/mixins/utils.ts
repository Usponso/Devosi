import type { Session } from "@/types/Session";
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
        },
        getTimeFormatted(session: Session): string {
            const date = new Date(`${session.date} ${session.time}`);
            return `${date.getHours() < 10 ? '0'+date.getHours() : date.getHours()}H${date.getMinutes() < 10 ? '0'+date.getMinutes() : date.getMinutes()}`;
        }
    }
}

export default utils;