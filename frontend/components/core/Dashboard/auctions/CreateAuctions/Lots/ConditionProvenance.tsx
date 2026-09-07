import DashboardFormText from "@/components/common/DashboardFormText";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import { Input } from "@/components/ui/input";

export default function ConditionProvenance() {
    return (
        <div className="px-6">
            <div className="mt-10">
                <DashboardFormText text="Condition Report" />

                <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Overall Condition Class
                        </label>

                        <select
                            className="w-full border rounded-md px-3 py-2"
                        >
                            <option value="">
                                Select Overall Condition Class
                            </option>

                            <option value="live">
                                Live Auction
                            </option>

                            <option value="online">
                                Online Auction
                            </option>
                        </select>
                    </div>
                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Frame Condition
                        </label>

                        <select
                            className="w-full border rounded-md px-3 py-2"
                        >
                            <option value="">
                                Select Overall Condition Class
                            </option>

                            <option value="live">
                                Live Auction
                            </option>

                            <option value="online">
                                Online Auction
                            </option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 w-full">
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Detailed Condition Notes
                        </label>

                        <Input
                            type="text"
                            placeholder="Describe any micro , surface discoloration"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                </div>

                <div className="grid grid-cols-1 gap-2 w-full">
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Restoration & Conservation History
                        </label>

                        <Input
                            type="text"
                            placeholder="Provide Details of any conservation treatments"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                </div>
            </div>
            <div className="mt-10">
                <DashboardFormText text="Provenance & History" />


                <div className="grid grid-cols-3 gap-2 w-full">
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Previous Owner / collection
                        </label>

                        <Input
                            type="text"
                            placeholder="e.g. Private Collection , Mumbai"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Acquisition Method
                        </label>

                        <select
                            className="w-full border rounded-md px-3 py-2"
                        >
                            <option value="">
                                Select  Acquisition Method
                            </option>

                            <option value="live">
                                Live Auction
                            </option>

                            <option value="online">
                                Online Auction
                            </option>
                        </select>
                    </div>

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Acquisition Date
                        </label>

                        <DatePicker placeholder="Select the auction's start date" className="w-95" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 w-full">
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Exhibition History
                        </label>

                        <Input
                            type="text"
                            placeholder="List major exhibitions, museum displays"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                </div>
            </div>
            <div className="mt-10 pb-10">
                <DashboardFormText text="Authentication Metadata" />


                <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Authenticate By
                        </label>

                        <Input
                            type="text"
                            placeholder="Expert Name"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Authenticate Date
                        </label>

                        <DatePicker placeholder="Select the auction's start date" className="w-xl" />
                    </div>

                </div>


            </div>
        </div>
    )
}