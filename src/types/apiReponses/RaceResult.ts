import type {Races} from "@/types/apiReponses/Races";

export interface RaceResult {
  MRData: {
    RaceTable: {
      Races: Races[]
    }
  }
}