import Heading from "@/components/ui/heading";
import { api } from "@/trpc/server";
import ApprtsList from "@/components/apprts/List";
import { GetApprenticeship } from "@/server/schema/apprenticeship";
import ApprtsTable from "@/components/dash/ApprtsWithUsersTable";

export default async function Apprenticeships() {
  const apprts = await api.apprts.getApprenticeships.query();
  const user = await api.user.getAuthedUserWithInstitution.query();
  // console.log(usersWithApprts[0].user?.id)
  /*const apprtsExtra = [
    { id: "1",
      user_id: "1132747679",
      start_date: new Date(),
      end_date: new Date(),
      referral: null,
      report: null,
      curatorId: null,
      academic_year: "3",
      apprenticeshipTypeId: "1",
      referral_signed: null,
      employment_status: null,
      attendance: null,
      signed: true,
      report_signed: true
    },
    { id: "2",
      user_id: "2",
      start_date: new Date(),
      end_date: new Date(),
      referral: null,
      report: null,
      curatorId: null,
      academic_year: "3",
      apprenticeshipTypeId: "2",
      referral_signed: null,
      employment_status: null,
      attendance: null,
      signed: true,
      report_signed: true
    },
  ]*/

  return (
    <div className={`${user?.role !== 'STUDENT' && 'absolute p-4 w-full left-0 max-w-full'}`}>
      <div className="">
        <Heading
          title={`${user?.role !== 'STUDENT' ? 'My' : ''} Apprenticeships`}
          description={`${user?.role !== 'STUDENT' ? "View your apprenticeships here." : ''}`}
        ></Heading>
      </div>
      {
        user?.role == "STUDENT" ?
          <ApprtsList apprts={apprts} /> :
          <ApprtsTable />
      }
    </div>
  );
}
