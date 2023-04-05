import axios from 'axios';

const f1Instance = axios.create({
    baseURL: "http://ergast.com/api/f1/"
});

export async function getDriverStandings(season: string){
    try{
        const res = await f1Instance.get(`${season}/driverStandings.json`);
        // await new Promise(resolve => setTimeout(resolve, 3000)); // simulate slow response
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}

export async function getConstructorStandings(season: string){
    try{
        const res = await f1Instance.get(`${season}/constructorStandings.json`);
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}