import type {GrandPrix} from "@/types/GrandPrix";

export interface RaceSchedule {
  MRData: {
    RaceTable: {
      Races: GrandPrix[]
    }
  }
}