import LandingContentList, {
    type LandingRow,
} from '../../components/LandingContentList';

export default function KelolaProgram({
    program = [],
}: {
    program?: LandingRow[];
}) {
    return <LandingContentList section="program" rows={program} />;
}
