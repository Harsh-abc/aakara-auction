import DashboardFormText from "@/components/common/DashboardFormText";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
export default function LotsDetail() {
    return (
        <div className="px-6 pb-5 mb-20">

            <DashboardFormText text="Primary Artwork Information" />

            <div className="grid grid-cols-2 gap-4">

                <div className="input-wrapper">
                    <label className="block mb-2">
                        Lot Title
                    </label>

                    <Input
                        type="text"
                        placeholder="Enter a title for your auction (e.g First Auction)"
                        className="w-full border rounded-md px-3 py-2 h-11"
                    />
                </div>

                <div className="input-wrapper ">
                    <label className="block mb-2">
                        Artist Name
                    </label>

                    <Input
                        type="text"
                        placeholder="Enter Artist"
                        className="w-full border rounded-md px-3 py-2 h-11"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">

                <div className="input-wrapper">
                    <label className="block mb-2">
                        Artwork ID
                    </label>

                    <Input
                        type="text"
                        placeholder=""
                        className="w-full border rounded-md px-3 py-2 h-11"
                    />
                </div>

                <div className="input-wrapper ">
                    <label className="block mb-2">
                        Category
                    </label>

                    <select
                        className="w-full border rounded-md px-3 py-2"
                    >
                        <option value="">
                            Select Category type
                        </option>

                        <option value="live">
                            Modern
                        </option>

                        <option value="online">
                            Nature
                        </option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">

                <div className="input-wrapper">
                    <label className="block mb-2">
                        Medium
                    </label>

                    <Input
                        type="text"
                        placeholder="eg. Oil on Canvas, Bronze Sculpture"
                        className="w-full border rounded-md px-3 py-2 h-11"
                    />
                </div>

                <div className="input-wrapper ">
                    <label className="block mb-2">
                        Year of creation
                    </label>

                    <Input
                        type="text"
                        placeholder="YYYY"
                        className="w-full border rounded-md px-3 py-2 h-11"
                    />
                </div>
            </div>

            <div className="px-6  bg-[#f4f2f2] py-6 my-6 rounded-[8px]">
                <h1 className="text-[16px] font-bold">Artwork Measurement</h1>

                <div className="flex items-center justify-between gap-0">

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            width (cm)
                        </label>

                        <Input
                            type="text"
                            placeholder=""
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Height (cm)
                        </label>

                        <Input
                            type="text"
                            placeholder=""
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Depth (cm)
                        </label>

                        <Input
                            type="text"
                            placeholder=""
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Unit
                        </label>

                        <select
                            className="w-full border rounded-md px-3 py-2"
                        >
                            <option value="">
                                cm
                            </option>

                            <option value="live">
                                cm
                            </option>

                            <option value="online">
                                mm
                            </option>
                            <option value="online">
                                M
                            </option>
                        </select>
                    </div>

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Weight (in Kg)
                        </label>

                        <Input
                            type="text"
                            placeholder=""
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>
                </div>

            </div>


            <div>
                <h6 className="text-[13px] font-semibold">Edition Type</h6>
                <RadioGroup defaultValue="Unique" className="w-fit flex items-center mt-4">
                    <div className="flex items-center gap-3">
                        <RadioGroupItem value="Unique" id="r1" />
                        <Label htmlFor="r1">Unique / Original</Label>
                    </div>
                    <div className="flex items-center gap-3">
                        <RadioGroupItem value="Limited" id="r2" />
                        <Label htmlFor="r2">Limited Edition</Label>
                    </div>
                    <div className="flex items-center gap-3">
                        <RadioGroupItem value="Open" id="r3" />
                        <Label htmlFor="r3">Open Edition</Label>
                    </div>
                </RadioGroup>
            </div>
        </div>
    )
}




