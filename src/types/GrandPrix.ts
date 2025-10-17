import type {Circuit} from "@/types/Circuit";
import type {Session} from "@/types/Session";

export interface GrandPrix {
  season: string,
  round: string,
  url: string,
  raceName: string,
  Circuit: Circuit,
  date: string,
  time: string,
  FirstPractice: Session,
  SecondPractice: Session,
  ThirdPractice: Session,
  Qualifying: Session,
  Sprint: Session,
  SprintQualifying: Session
}