// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockStripe = {
  checkout: async (planId: string, cardDetails: Record<string, string>) => {
    await delay(2000); // 2s processing
    if (cardDetails.number === "4242 4242 4242 0000") {
        throw new Error("Card declined");
    }
    return { success: true, transactionId: "tx_mock_12345" };
  }
};
