import {AdminDashboard} from '../../../components/AdminDashboard';
export const metadata={title:'Edit household',robots:{index:false,follow:false}};
export default async function HouseholdPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <div className="page-shell" style={{maxWidth:1400}}><AdminDashboard householdId={id}/></div>;}
