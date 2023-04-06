import axios from 'axios';

const f1Instance = axios.create({
    baseURL: "https://ergast.com/api/f1/"
});

export async function getAllRacesBySeason(season: string){
    try{
        const res = await f1Instance.get(`${season}.json`);
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}

export async function getRaceBySeasonAndRound(season: string, round: string){
    try{
        const res = await f1Instance.get(`${season}/${round}.json`);
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}

export async function getNextRace(){
    try{
        const res = await f1Instance.get(`current/next.json`);
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}

export async function getRaceResult(season: string, round: string){
    try{
        const res = await f1Instance.get(`${season}/${round}/results.json`);
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}