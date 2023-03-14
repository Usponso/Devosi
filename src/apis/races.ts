import axios from 'axios';

const f1Instance = axios.create({
    baseURL: "http://ergast.com/api/f1/"
});

export async function getAllRacesBySeason(season: string){
    try{
        const res = await f1Instance.get(season+'.json');
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}

export async function getNextRace(){
    try{
        const res = await f1Instance.get('current/next.json');
        console.log(res.data);
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}