const utils = {
    methods: {
        formatDate(startDate: string, endDate: string): string{
            const month = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
            if(startDate.substring(5,7) != endDate.substring(5,7)){
                return `${startDate.substring(8)} ${month[parseInt(startDate.substring(5,7))-1]} - ${endDate.substring(8)} ${month[parseInt(endDate.substring(5,7))-1]}`;
            } else {
                return startDate.substring(8) + '-' + endDate.substring(8) + ' ' + month[parseInt(endDate.substring(5,7))-1]
            }
        },
    }
}

export default utils;