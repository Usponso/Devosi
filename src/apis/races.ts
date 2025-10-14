import axios from 'axios';
import type {RaceSchedule} from "@/types/apiReponses/RaceSchedule";
import type {RaceResult} from "@/types/apiReponses/RaceResult";

const f1Instance = axios.create({
    baseURL: "https://api.jolpi.ca/ergast/f1/"
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
        const res = await f1Instance.get(`${season}/${round}/results.json`);
        return res.data;
    } catch(e){
        throw new Error('La requête a échoué.\n' + e);
    }
}