import DashboardFormText from "@/components/common/DashboardFormText";
import { Input } from "@/components/ui/input";

export default function PricingValuation() {
    return (
        <div className="px-6 pb-6">
            <div>
                <DashboardFormText text="Finacial Strategy & Thresholds" />

                <div className="grid grid-cols-3 gap-4 w-full">

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Starting Bid Price
                        </label>

                        <Input
                            type="text"
                            placeholder="₹ Enter Starting Bid Amount"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Reserve Price
                        </label>

                        <Input
                            type="text"
                            placeholder="₹ Enter Reserve Price"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Minimum Price
                        </label>

                        <Input
                            type="text"
                            placeholder="₹ Enter Minimum Price"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>
                </div>


                <div className="grid grid-cols-3 gap-4 w-full">

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Estimated Start Value
                        </label>

                        <Input
                            type="text"
                            placeholder="₹ Enter Estimated Start Value"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Estimated End Value
                        </label>

                        <Input
                            type="text"
                            placeholder="₹ Enter Estimated End Value"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Insurance Declared value
                        </label>

                        <Input
                            type="text"
                            placeholder="₹ Insurance Declared value"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-10">
                <DashboardFormText text="Finacial Strategy & Thresholds" />

                <div className="grid grid-cols-2 gap-4 w-full">

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            GST Rate (%)
                        </label>

                        <Input
                            type="text"
                            placeholder="Enter A GST Rate"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            HSN Code
                        </label>

                        <Input
                            type="text"
                            placeholder="Enter HSN Code"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>
                </div>

            </div>
        </div>
    )
}