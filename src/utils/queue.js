const createQueue = (tasks, maxNumOfWorkers = 10) => {
	let numOfWorkers = 0
	let taskIndex = 0

	return new Promise(resolve => {
		const handleResult = index => result => {
			tasks[index] = result
			numOfWorkers--
			getNextTask()
		}
		const getNextTask = () => {
			if (numOfWorkers < maxNumOfWorkers && taskIndex < tasks.length) {
				tasks[taskIndex]()
					.then(handleResult(taskIndex))
					.catch(handleResult(taskIndex))
				taskIndex++
				numOfWorkers++
				getNextTask()
			} else if (numOfWorkers === 0 && taskIndex === tasks.length) {
				resolve(tasks)
			}
		}
		getNextTask()
	})
}

export default createQueue
