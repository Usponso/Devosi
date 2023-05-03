export default interface DriverProfile {
    driverId: string,
    givenName: string,
    familyName: string,
    dateOfBirth: string,
    code: string,
    permanentNumber: string,
    nationality: string,
    Constructor: {
        constructorId: string,
        name: string,
        nationality: string
    },
    races: string,
    wins: string,
    podiums: string,
}