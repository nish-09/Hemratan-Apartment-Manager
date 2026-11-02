import { redirect } from 'next/navigation';

export default function ResidentParkingRedirect() {
  redirect('/resident/deliveries');
}
