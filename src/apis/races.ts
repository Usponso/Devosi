import axios from 'axios';
import type {RaceSchedule} from "@/types/apiReponses/RaceSchedule";
import type {RaceResult} from "@/types/apiReponses/RaceResult";

const f1Instance = axios.create({
    baseURL: "https://ergast.com/api/f1/"
});

export async function getAllRacesBySeason(season: string): Promise<RaceSchedule> {
    try{
        const res = await f1Instance.get(`${season}.json`);
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}

export async function getRaceBySeasonAndRound(season: string, round: string): Promise<RaceSchedule> {
    try{
        const res = await f1Instance.get(`${season}/${round}.json`);
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}

export async function getNextRace(): Promise<RaceSchedule> {
    try{
        const res = await f1Instance.get(`current/next.json`);
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}

export async function getRaceResult(season: string, round: string): Promise<RaceResult> {
    try{
        console.log(`${season}/${round}/results.json`);
        const res = await f1Instance.get(`${season}/${round}/results.json`);
        console.log(res.data);
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}