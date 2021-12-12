import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
    children: ReactNode;
}

interface UpdateProductAmount {
    productId: number;
    amount: number;
}

interface CartContextData {
    cart: Product[];
    addProduct: (productId: number) => Promise<void>;
    removeProduct: (productId: number) => void;
    updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem("@RocketShoes:cart");
        if (storagedCart) {
            return JSON.parse(storagedCart);
        }
        return [];
    });

    const fetchProductFromStock = async (productId: number) => {
        const { data } = await api.get<Stock>(`stock/${productId}`);
        return data;
    };

    const showOutOfStockMessage = () => {
        toast.error("Quantidade solicitada fora de estoque");
    };

    const fetchProduct = async (productId: number) => {
        const { data } = await api.get(`products/${productId}`);
        return data;
    };

    const addUpdatedCartToLocalStorage = (updatedCart: Product[]) => {
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    };

    const showSuccessMessage = (message: string) => {
        toast.success(message);
    };

    const showErrorMessage = (message: string) => {
        toast.error(message);
    };

    const addProduct = async (productId: number) => {
        try {
            const indexOfProduct = cart.findIndex(
                (product) => product.id === productId
            );
            let updatedCart = [...cart];
            const productIsInCart = indexOfProduct !== -1;
            if (productIsInCart) {
                const data = await fetchProductFromStock(productId);
                const stockQuantityIsLessThanRequired =
                    cart[indexOfProduct].amount >= data.amount;
                if (stockQuantityIsLessThanRequired) {
                    showOutOfStockMessage();
                    return;
                }
                updatedCart[indexOfProduct].amount += 1;
                setCart(updatedCart);
            } else {
                const data = await fetchProduct(productId);
                updatedCart = [...cart, { ...data, amount: 1 }];
                setCart(updatedCart);
            }
            addUpdatedCartToLocalStorage(updatedCart);
            showSuccessMessage("Produto adicionado ao carrinho");
        } catch {
            showErrorMessage("Erro na adição do produto");
        }
    };

    const removeProduct = (productId: number) => {
        try {
            const indexOfProduct = cart.findIndex(
                (product) => product.id === productId
            );
            const productIsNotInCart = indexOfProduct === -1;
            if (productIsNotInCart) {
                showErrorMessage("Erro na remoção do produto");
                return;
            }
            const updatedCart = cart.filter(
                (product) => product.id !== productId
            );
            setCart(updatedCart);
            addUpdatedCartToLocalStorage(updatedCart);
        } catch {
            showErrorMessage("Erro na remoção do produto");
        }
    };

    const updateProductAmount = async ({
        productId,
        amount,
    }: UpdateProductAmount) => {
        try {
            const isProductQuantityValid = amount > 0;
            if (!isProductQuantityValid) return;
            const indexOfProduct = cart.findIndex(
                (product) => product.id === productId
            );
            const productIsNotInCart = indexOfProduct === -1;
            if (productIsNotInCart) {
                showErrorMessage("Erro na alteração de quantidade do produto");
                return;
            }
            const data = await fetchProductFromStock(productId);
            const productIsNotAvailable = amount > data.amount;
            if (productIsNotAvailable) {
                showOutOfStockMessage();
                return;
            }
            const updatedCart = [...cart];
            updatedCart[indexOfProduct].amount = amount;
            setCart(updatedCart);
            addUpdatedCartToLocalStorage(updatedCart);
        } catch {
            showErrorMessage("Erro na alteração de quantidade do produto");
        }
    };

    return (
        <CartContext.Provider
            value={{ cart, addProduct, removeProduct, updateProductAmount }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
    const context = useContext(CartContext);

    return context;
}
