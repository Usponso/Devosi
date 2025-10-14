import type {Circuit} from "@/types/Circuit";
import type {Result} from "@/types/Result";

export interface Races {
  season: string,
  round: string,
  url: string,
  raceName: string,
  Circuit: Circuit,
  date: string,
  time: string,
  Results: Result[]
}