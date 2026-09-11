import axios, { AxiosResponse } from 'axios'

export const axiosInstance = axios.create({
    withCredentials: true,
})

interface ApiConnectorProps {
    method: string
    url: string
    body?: any
    header?: any
    params?: any
}

export const apiConnector = <T = any>({
    method,
    url,
    body,
    header,
    params,
}: ApiConnectorProps): Promise<AxiosResponse<T>> => {
    return axiosInstance({
        method: `${method}`,
        url: `${url}`,
        data: body ? body : null,
        headers: header ? header : null,
        params: params ? params : null,
    })
}