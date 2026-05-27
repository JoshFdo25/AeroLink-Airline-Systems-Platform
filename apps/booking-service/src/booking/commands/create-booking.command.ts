export class CreateBookingCommand {
  constructor(
    public readonly passengerId: string,
    public readonly flightId: string,
    public readonly paymentToken: string,
    public readonly price: number,
  ) {}
}
