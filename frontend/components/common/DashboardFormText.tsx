interface DashboardFormProps {
    text: string;
    className?: string;
}

const DashboardFormText = ({
    text,
    className = "",
}: DashboardFormProps) => {
    return (
        <p
            className={`text-[18px] font-bold text-slate-950 ${className}`}
        >
            {text}
        </p>
    );
};

export default DashboardFormText;