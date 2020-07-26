const createQueue = <T>(
	tasks: (() => Promise<T | Error>)[],
	maxNumOfWorkers = 10
): Promise<(T | Error)[]> => {
	let numOfWorkers = 0
	let taskIndex = 0

	const output: (T | Error)[] = new Array(tasks.length)

	return new Promise((resolve) => {
		const handleResult = (index: number) => (result: T | Error) => {
			output[index] = result
			numOfWorkers--
			getNextTask()
		}
		const getNextTask = () => {
			if (numOfWorkers < maxNumOfWorkers && taskIndex < tasks.length) {
				tasks[taskIndex]().then(handleResult(taskIndex)).catch(handleResult(taskIndex))

				taskIndex++
				numOfWorkers++

				getNextTask()
			} else if (numOfWorkers === 0 && taskIndex === tasks.length) {
				resolve(output)
			}
		}

		getNextTask()
	})
}

export default createQueue
