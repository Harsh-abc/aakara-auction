import axios, { AxiosResponse, ResponseType } from 'axios'

export const axiosInstance = axios.create({
    withCredentials: true,
})

interface ApiConnectorProps {
    method: string
    url: string
    body?: any
    header?: any
    params?: any
    /** e.g. "blob" for file downloads */
    responseType?: ResponseType
}

export const apiConnector = <T = any>({
    method,
    url,
    body,
    header,
    params,
    responseType,
}: ApiConnectorProps): Promise<AxiosResponse<T>> => {
    return axiosInstance({
        method: `${method}`,
        url: `${url}`,
        data: body ? body : null,
        headers: header ? header : null,
        params: params ? params : null,
        ...(responseType && { responseType }),
    })
}