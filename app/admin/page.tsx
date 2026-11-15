import {AdminHouseholdTable} from '../components/AdminHouseholdTable';
export const metadata={title:'Wedding planning',robots:{index:false,follow:false}};
export default function AdminPage(){return <div className="page-shell" style={{maxWidth:1400}}><AdminHouseholdTable/></div>;}
