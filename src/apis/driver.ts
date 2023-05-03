import axios from 'axios';
import type DriverProfile from "@/types/DriverProfile";
import type DriverConstructor from "@/types/DriverConstructor";
import type DriverInformation from "@/types/DriverInformation";

const f1Instance = axios.create({
    baseURL: "https://ergast.com/api/f1/"
});

export function getDriverNbRaces(driverId: string): Promise<string>{
    return f1Instance.get(`drivers/${driverId}/results.json`).then((res) => {
       return res.data.MRData.total;
    }).catch((err) => {
        throw new Error('La requête a échoué (getDriverRaces).\n' + err);
    });
}

export function getDriverNbPosition(driverId: string, position: string): Promise<string> {
    return f1Instance.get(`drivers/${driverId}/results/${position}.json`).then((res) => {
        return res.data.MRData.total;
    }).catch((err) => {
        throw new Error('La requête a échoué (getDriverPodiums).\n' + err);
    });
}

export function getDriverNbPodiums(driverId: string): Promise<string> {
    try {
        return getDriverNbPosition(driverId, '1').then((wins) => {
            return getDriverNbPosition(driverId, '2').then((second) => {
                return getDriverNbPosition(driverId, '3').then((third) => {
                    return ''+ (parseInt(wins) + parseInt(second) + parseInt(third));
                });
            });
        });
    } catch(e) {
        throw new Error('La requête a échoué (getDriverPodiums).\n' + e);
    }
}

export function getDriverConstructor(driverId: string): Promise<DriverConstructor>{
    return f1Instance.get(`current/drivers/${driverId}/constructors.json`).then((res) => {
        return res.data.MRData.ConstructorTable.Constructors[0];
    }).catch((err) => {
        throw new Error('La requête a échoué (getDriverConstructor).\n' + err);
    });
}

export function getDriverInformation(driverId: string): Promise<DriverInformation> {
    return f1Instance.get(`current/drivers/${driverId}.json`).then((res) => {
        return res.data.MRData.DriverTable.Drivers[0];
    }).catch((err) => {
        throw new Error('La requête a échoué (getDriverInformation).\n' + err);
    });
}

export async function getDriverProfile(driverId: string): Promise<DriverProfile> {
    const constructor = await getDriverConstructor(driverId);
    const races = await getDriverNbRaces(driverId);
    const wins = await getDriverNbPosition(driverId, '1');
    const podiums = await getDriverNbPodiums(driverId);
    const driverInfo = await getDriverInformation(driverId);
    return {
        driverId: driverId,
        races: races,
        wins: wins,
        Constructor: constructor,
        podiums: podiums,
        code: driverInfo ? driverInfo.code : '',
        dateOfBirth: driverInfo ? driverInfo.dateOfBirth : '',
        familyName: driverInfo ? driverInfo.familyName : '',
        givenName: driverInfo ? driverInfo.givenName : '',
        nationality: driverInfo ? driverInfo.nationality : '',
        permanentNumber: driverInfo ? driverInfo.permanentNumber : ''
    };
}