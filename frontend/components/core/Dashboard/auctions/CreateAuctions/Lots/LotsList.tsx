"use client";

type LotsListProps = {
    lots: any[];
    onAddLot: () => void;
    onSelectLot: (index: number) => void;
    onRemoveLot: (index: number) => void;
};

export default function LotsList({
    lots,
    onAddLot,
    onSelectLot,
    onRemoveLot,
}: LotsListProps) {
    return (
        <div>

            {lots.length === 0 ? (
                <div className="border rounded-xl p-10 text-center">

                    <h2 className="text-lg font-semibold">
                        No Lots Added
                    </h2>

                    <p className="text-sm text-gray-500 mt-2">
                        Add artwork lots to this auction.
                    </p>

                    <button
                        type="button"
                        onClick={onAddLot}
                        className="mt-6 bg-black text-white px-5 py-2 rounded-md"
                    >
                        + Add New Lot
                    </button>

                </div>
            ) : (
                <div className="space-y-4">

                    <div className="flex justify-between items-center">

                        <h2 className="text-lg font-semibold">
                            Auction Lots
                        </h2>

                        <button
                            type="button"
                            onClick={onAddLot}
                            className="bg-black text-white px-4 py-2 rounded-md"
                        >
                            + Add New Lot
                        </button>

                    </div>

                    {lots.map((lot, index) => (

                        <div
                            key={lot.id}
                            className="border rounded-lg p-4 flex justify-between"
                        >

                            <div>
                                <p className="font-medium">
                                    Lot {index + 1}
                                </p>

                                <p className="text-sm text-gray-500">
                                    {lot.details?.title ||
                                        "Untitled Artwork"}
                                </p>
                            </div>

                            <div className="flex gap-2">

                                <button
                                    type="button"
                                    onClick={() =>
                                        onSelectLot(index)
                                    }
                                    className="border px-3 py-1 rounded-md"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        onRemoveLot(index)
                                    }
                                    className="border px-3 py-1 rounded-md text-red-500"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>

                    ))}

                </div>
            )}

        </div>
    );
}